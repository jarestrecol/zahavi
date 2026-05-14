import type { Kysely } from 'kysely';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';
import type {
  OrdenDeProduccion,
  OrdenDeProduccionId,
  EstadoDeOrdenDeProduccion,
} from '@zahavi/domain-production';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { ProductionDatabase, BomLineJson, MermaJson } from './schema.js';
import { rowToOrden, ordenToInsertRow } from './mappers.js';

export class RepositorioDeOrdenesSupabase implements IOrdenDeProduccionRepository {
  constructor(private readonly db: Kysely<ProductionDatabase>) {}

  async save(orden: OrdenDeProduccion, _correlacionId: string): Promise<void> {
    try {
      const row = ordenToInsertRow(orden);
      await this.db.insertInto('production.orders').values(row).execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(orden: OrdenDeProduccion, _correlacionId: string): Promise<void> {
    try {
      const row = ordenToInsertRow(orden);
      await this.db
        .updateTable('production.orders')
        .set({
          estado: row.estado,
          bom: row.bom,
          mermas: row.mermas,
          lote: row.lote,
          actualizada_en: row.actualizada_en,
        })
        .where('id', '=', row.id)
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: OrdenDeProduccionId): Promise<OrdenDeProduccion | null> {
    try {
      const row = await this.db
        .selectFrom('production.orders')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();

      if (!row) return null;
      return rowToOrden({
        ...row,
        bom: (typeof row.bom === 'string' ? JSON.parse(row.bom) : row.bom) as BomLineJson[],
        mermas: (typeof row.mermas === 'string'
          ? JSON.parse(row.mermas)
          : row.mermas) as MermaJson[],
        lote: row.lote
          ? ((typeof row.lote === 'string' ? JSON.parse(row.lote) : row.lote) as {
              codigo: string;
              cantidad_producida: number;
              producido_en: string;
            })
          : null,
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorEstado(
    estado: EstadoDeOrdenDeProduccion,
  ): Promise<ReadonlyArray<OrdenDeProduccion>> {
    try {
      const rows = await this.db
        .selectFrom('production.orders')
        .selectAll()
        .where('estado', '=', estado)
        .orderBy('creada_en', 'desc')
        .execute();

      return rows.map((row) =>
        rowToOrden({
          ...row,
          bom: (typeof row.bom === 'string' ? JSON.parse(row.bom) : row.bom) as BomLineJson[],
          mermas: (typeof row.mermas === 'string'
            ? JSON.parse(row.mermas)
            : row.mermas) as MermaJson[],
          lote: row.lote
            ? ((typeof row.lote === 'string' ? JSON.parse(row.lote) : row.lote) as {
                codigo: string;
                cantidad_producida: number;
                producido_en: string;
              })
            : null,
        }),
      );
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorPlanta(plantaId: string): Promise<ReadonlyArray<OrdenDeProduccion>> {
    try {
      const rows = await this.db
        .selectFrom('production.orders')
        .selectAll()
        .where('planta_central_id', '=', plantaId)
        .orderBy('creada_en', 'desc')
        .execute();

      return rows.map((row) =>
        rowToOrden({
          ...row,
          bom: (typeof row.bom === 'string' ? JSON.parse(row.bom) : row.bom) as BomLineJson[],
          mermas: (typeof row.mermas === 'string'
            ? JSON.parse(row.mermas)
            : row.mermas) as MermaJson[],
          lote: row.lote
            ? ((typeof row.lote === 'string' ? JSON.parse(row.lote) : row.lote) as {
                codigo: string;
                cantidad_producida: number;
                producido_en: string;
              })
            : null,
        }),
      );
    } catch (e) {
      throw new Err(e);
    }
  }
}
