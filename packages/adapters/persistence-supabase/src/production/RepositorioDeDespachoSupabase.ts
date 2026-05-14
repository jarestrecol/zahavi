import type { Kysely } from 'kysely';
import type { IDespachoRepository } from '@zahavi/ports';
import type { DespachoAPunto, DespachoId, OrdenDeProduccionId } from '@zahavi/domain-production';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { ProductionDatabase } from './schema.js';
import { rowToDespacho, despachoToInsertRow } from './mappers.js';

export class RepositorioDeDespachoSupabase implements IDespachoRepository {
  constructor(private readonly db: Kysely<ProductionDatabase>) {}

  async save(despacho: DespachoAPunto, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('production.dispatches')
        .values(despachoToInsertRow(despacho))
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(despacho: DespachoAPunto, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .updateTable('production.dispatches')
        .set({
          estado: despacho.estado,
          actualizado_en: new Date().toISOString(),
        })
        .where('id', '=', despacho.id.toString())
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: DespachoId): Promise<DespachoAPunto | null> {
    try {
      const row = await this.db
        .selectFrom('production.dispatches')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();

      return row ? rowToDespacho(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorOrden(ordenId: OrdenDeProduccionId): Promise<ReadonlyArray<DespachoAPunto>> {
    try {
      const rows = await this.db
        .selectFrom('production.dispatches')
        .selectAll()
        .where('orden_id', '=', ordenId.toString())
        .orderBy('creado_en', 'desc')
        .execute();

      return rows.map(rowToDespacho);
    } catch (e) {
      throw new Err(e);
    }
  }
}
