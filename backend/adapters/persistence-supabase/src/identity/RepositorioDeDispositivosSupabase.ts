import { type Kysely, sql } from 'kysely';
import type { RepositorioDeDispositivosAutorizados } from '@zahavi/ports';
import type { DispositivoAutorizado, DispositivoId } from '@zahavi/domain-identity';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { IdentityDatabase } from './schema.js';
import { rowsToDispositivo, dispositivoToRows } from './mappers.js';

export class RepositorioDeDispositivosSupabase implements RepositorioDeDispositivosAutorizados {
  constructor(private readonly db: Kysely<IdentityDatabase>) {}

  async obtenerPorId(id: DispositivoId): Promise<DispositivoAutorizado | null> {
    try {
      const deviceRow = await this.db
        .selectFrom('identity.dispositivos_autorizados')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      if (deviceRow === undefined) return null;

      const historialRows = await this.db
        .selectFrom('identity.historial_estados_dispositivo')
        .selectAll()
        .where('dispositivo_id', '=', id.toString())
        .orderBy('orden', 'asc')
        .execute();

      return rowsToDispositivo(deviceRow, historialRows);
    } catch (e) {
      throw new Err(e);
    }
  }

  async guardar(dispositivo: DispositivoAutorizado): Promise<void> {
    try {
      const { device, historial } = dispositivoToRows(dispositivo);

      await this.db.transaction().execute(async (trx) => {
        await trx
          .insertInto('identity.dispositivos_autorizados')
          .values(device)
          .onConflict((oc) => oc.column('id').doUpdateSet(device))
          .execute();

        await trx
          .deleteFrom('identity.historial_estados_dispositivo')
          .where('dispositivo_id', '=', device.id)
          .execute();

        if (historial.length > 0) {
          await trx
            .insertInto('identity.historial_estados_dispositivo')
            .values(historial)
            .execute();
        }
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async existeNombre(nombre: string): Promise<boolean> {
    try {
      const row = await this.db
        .selectFrom('identity.dispositivos_autorizados')
        .select('id')
        .where('nombre', '=', nombre)
        .executeTakeFirst();
      return row !== undefined;
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarActivos(): Promise<DispositivoAutorizado[]> {
    try {
      // Obtiene los IDs de dispositivos cuyo último historial tiene estado='activo'.
      const activeIds = await sql<{ id: string }>`
        SELECT d.id
        FROM identity.dispositivos_autorizados d
        WHERE (
          SELECT h.estado
          FROM identity.historial_estados_dispositivo h
          WHERE h.dispositivo_id = d.id
          ORDER BY h.orden DESC
          LIMIT 1
        ) = 'activo'
      `.execute(this.db);

      const result: DispositivoAutorizado[] = [];
      for (const { id } of activeIds.rows) {
        const deviceRow = await this.db
          .selectFrom('identity.dispositivos_autorizados')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst();
        if (deviceRow === undefined) continue;

        const historialRows = await this.db
          .selectFrom('identity.historial_estados_dispositivo')
          .selectAll()
          .where('dispositivo_id', '=', id)
          .orderBy('orden', 'asc')
          .execute();
        result.push(rowsToDispositivo(deviceRow, historialRows));
      }
      return result;
    } catch (e) {
      throw new Err(e);
    }
  }

  async estaActivo(id: DispositivoId): Promise<boolean> {
    try {
      const row = await this.db
        .selectFrom('identity.historial_estados_dispositivo')
        .select(['estado', 'orden'])
        .where('dispositivo_id', '=', id.toString())
        .orderBy('orden', 'desc')
        .limit(1)
        .executeTakeFirst();
      return row !== undefined && row.estado === 'activo';
    } catch (e) {
      throw new Err(e);
    }
  }
}
