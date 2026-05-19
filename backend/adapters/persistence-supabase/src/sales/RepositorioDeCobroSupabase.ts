import type { Kysely } from 'kysely';
import type { ICobroRepository } from '@zahavi/ports';
import type { Cobro, CobroId, ComandaId } from '@zahavi/domain-sales';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { SalesDatabase, PagoDetalleJson } from './schema.js';
import { rowToCobro, cobroToInsertRow, parseJsonb } from './mappers.js';

export class RepositorioDeCobroSupabase implements ICobroRepository {
  constructor(private readonly db: Kysely<SalesDatabase>) {}

  async save(cobro: Cobro, _correlacionId: string): Promise<void> {
    try {
      await this.db.insertInto('sales.cobros').values(cobroToInsertRow(cobro)).execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(cobro: Cobro, _correlacionId: string): Promise<void> {
    try {
      const row = cobroToInsertRow(cobro);
      await this.db
        .updateTable('sales.cobros')
        .set({
          estado: row.estado,
          pagos: row.pagos,
          total_cobrado: row.total_cobrado,
          cambio: row.cambio,
          procesado_en: row.procesado_en,
          motivo_anulacion: row.motivo_anulacion,
        })
        .where('id', '=', row.id)
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: CobroId): Promise<Cobro | null> {
    try {
      const row = await this.db
        .selectFrom('sales.cobros')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      if (!row) return null;
      return rowToCobro({ ...row, pagos: parseJsonb<PagoDetalleJson[]>(row.pagos) });
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorComanda(comandaId: ComandaId): Promise<Cobro | null> {
    try {
      const row = await this.db
        .selectFrom('sales.cobros')
        .selectAll()
        .where('comanda_id', '=', comandaId.toString())
        .orderBy('creado_en', 'desc')
        .executeTakeFirst();
      if (!row) return null;
      return rowToCobro({ ...row, pagos: parseJsonb<PagoDetalleJson[]>(row.pagos) });
    } catch (e) {
      throw new Err(e);
    }
  }
}
