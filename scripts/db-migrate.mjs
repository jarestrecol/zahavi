/**
 * Aplica todas las migraciones en supabase/migrations/ en orden ascendente.
 * Crea la tabla _migrations si no existe para rastrear qué se aplicó.
 *
 * Uso: node --env-file=.env scripts/db-migrate.mjs
 *      node --env-file=.env scripts/db-migrate.mjs --dry-run
 */

import { readFile, readdir } from 'fs/promises';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');
const DRY_RUN = process.argv.includes('--dry-run');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no definido. Copia .env.example a .env primero.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._migrations (
      id         SERIAL PRIMARY KEY,
      nombre     TEXT        NOT NULL UNIQUE,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT nombre FROM public._migrations ORDER BY nombre');
  return new Set(result.rows.map((r) => r.nombre));
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✓ Base de datos al día. Sin migraciones pendientes.');
      return;
    }

    console.log(`Migraciones pendientes: ${pending.length}`);

    for (const file of pending) {
      const path = join(MIGRATIONS_DIR, file);
      const sql = await readFile(path, 'utf-8');

      if (DRY_RUN) {
        console.log(`[dry-run] Se aplicaría: ${file}`);
        continue;
      }

      console.log(`Aplicando: ${file} ...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._migrations (nombre) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Error en ${file}:`, err.message);
        process.exit(1);
      }
    }

    if (!DRY_RUN) {
      console.log(`\n✓ ${pending.length} migración(es) aplicada(s) exitosamente.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
