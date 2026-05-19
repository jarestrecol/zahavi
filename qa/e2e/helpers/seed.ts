import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import pg from 'pg';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} es requerido para ejecutar el seed E2E`);
  return value;
}

// ── Datos de prueba fijos ────────────────────────────────────────────────────
export const SA_ID = '00000000-0000-0000-0000-000000000001';
export const SA_EMAIL = 'sa@zahavi.test';
export const SA_PASSWORD = 'SuperTest123!';
// Secreto TOTP conocido. El SA se semilla con totp_verificado = true.
export const SA_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

export const ADMIN_EMAIL = 'admin@zahavi.test';
export const ADMIN_PASSWORD = 'AdminTest123!';

export const WORKER_EMAIL = 'worker@zahavi.test';
export const WORKER_PIN = '123456';

export const DEVICE_ID = '00000000-0000-0000-0000-000000000010';
export const DEVICE_NAME = 'Tablet E2E Test';

export const BU_ID = '00000000-0000-0000-0000-000000000100';
export const BU_NOMBRE = 'Punto Test E2E';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un código TOTP válido para el SA a partir del secreto conocido. */
export function generateSaTotp(): string {
  return authenticator.generate(SA_TOTP_SECRET);
}

/**
 * Limpia los datos de prueba previos e inserta el estado mínimo necesario:
 * - 1 SUPERADMIN con TOTP ya enrolado y verificado
 * - 1 DispositivoAutorizado activo para el futuro WORKER
 *
 * SEGURIDAD: aborta si no estamos en entorno de test o si la DB no es local.
 * Esta función es el único bypass permitido del dominio y NUNCA debe ejecutarse contra producción.
 */
export async function seedAndClean(): Promise<void> {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('seedAndClean() solo puede ejecutarse con NODE_ENV=test');
  }

  const databaseUrl = requireEnv('DATABASE_URL');
  const urlLower = databaseUrl.toLowerCase();
  // Segunda línea de defensa: rechazar URLs que no sean localhost.
  // En CI con Docker Compose el host puede ser un alias de servicio (p.ej. "db");
  // en ese caso sobrepasar esta guarda con ALLOW_SEED_REMOTE=true o apuntar DATABASE_URL a 127.0.0.1.
  const esLocal =
    urlLower.includes('localhost') ||
    urlLower.includes('127.0.0.1') ||
    urlLower.includes('::1') ||
    process.env['ALLOW_SEED_REMOTE'] === 'true';
  if (!esLocal) {
    throw new Error(
      'seedAndClean() solo puede ejecutarse contra una base de datos local. ' +
        'En CI con Docker Compose usa ALLOW_SEED_REMOTE=true.',
    );
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Limpiar en orden de dependencias (hijos antes que padres)
    // sesiones referencia dispositivos_autorizados → borrar sesiones primero
    await client.query(
      `DELETE FROM identity.sesiones
       WHERE usuario_id IN (SELECT id FROM identity.usuarios WHERE email LIKE '%@zahavi.test')
          OR dispositivo_id = $1`,
      [DEVICE_ID],
    );
    await client.query(
      `DELETE FROM identity.historial_estados_dispositivo
       WHERE dispositivo_id = $1`,
      [DEVICE_ID],
    );
    await client.query(`DELETE FROM identity.dispositivos_autorizados WHERE id = $1`, [DEVICE_ID]);
    await client.query(`DELETE FROM identity.usuarios WHERE email LIKE '%@zahavi.test'`);

    // Insertar SUPERADMIN con TOTP pre-enrolado
    const saHashContrasena = bcrypt.hashSync(SA_PASSWORD, 10);
    await client.query(
      `INSERT INTO identity.usuarios
         (id, email, nombre_completo, rol, estado, tipo_credencial,
          hash_contrasena, secreto_totp, totp_verificado, hash_pin, creado_en, creado_por)
       VALUES ($1, $2, 'Super Admin E2E', 'SUPERADMIN', 'activo', 'navegador',
               $3, $4, TRUE, NULL, NOW(), NULL)`,
      [SA_ID, SA_EMAIL, saHashContrasena, SA_TOTP_SECRET],
    );

    // Insertar DispositivoAutorizado para el WORKER
    await client.query(
      `INSERT INTO identity.dispositivos_autorizados (id, nombre) VALUES ($1, $2)`,
      [DEVICE_ID, DEVICE_NAME],
    );
    await client.query(
      `INSERT INTO identity.historial_estados_dispositivo
         (dispositivo_id, estado, cambiado_en, cambiado_por, motivo, orden)
       VALUES ($1, 'activo', NOW(), $2, 'Autorizado para pruebas E2E', 0)`,
      [DEVICE_ID, SA_ID],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

/**
 * Extiende `seedAndClean` insertando una business unit de prueba y asignando
 * al SA a esa unidad. También limpia datos de catalog/inventory de pruebas previas.
 * Llama internamente a `seedAndClean` — no es necesario llamar ambas.
 */
export async function seedCatalogInventoryAndClean(): Promise<void> {
  await seedAndClean();

  const databaseUrl = requireEnv('DATABASE_URL');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Limpieza catalog/inventory de datos de prueba previos
    await client.query(
      `DELETE FROM catalog.products WHERE nombre LIKE '%E2E%' OR nombre LIKE '%Test%'`,
    );
    await client.query(
      `DELETE FROM catalog.categories WHERE nombre LIKE '%E2E%' OR nombre LIKE '%Test%'`,
    );
    await client.query(`DELETE FROM inventory.stock_items WHERE business_unit_id = $1`, [BU_ID]);
    await client.query(`DELETE FROM inventory.stock_movements WHERE business_unit_id = $1`, [
      BU_ID,
    ]);
    await client.query(
      `DELETE FROM inventory.ingredients WHERE nombre LIKE '%E2E%' OR nombre LIKE '%Test%'`,
    );
    await client.query(`DELETE FROM identity.user_business_units WHERE business_unit_id = $1`, [
      BU_ID,
    ]);
    await client.query(`DELETE FROM identity.business_units WHERE id = $1`, [BU_ID]);

    // Insertar BU de prueba
    await client.query(
      `INSERT INTO identity.business_units (id, nombre, tipo, estado, creado_en)
       VALUES ($1, $2, 'punto_de_venta', 'activa', NOW())`,
      [BU_ID, BU_NOMBRE],
    );

    // Asignar SA a la BU de prueba
    await client.query(
      `INSERT INTO identity.user_business_units (user_id, business_unit_id, asignado_en, asignado_por)
       VALUES ($1, $2, NOW(), $1)`,
      [SA_ID, BU_ID],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}
