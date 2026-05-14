import type { Kysely } from 'kysely';
import type { IMesaRepository } from '@zahavi/ports';
import type { Mesa, MesaId, EstadoDeMesa } from '@zahavi/domain-sales';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { SalesDatabase } from './schema.js';
import { rowToMesa, mesaToInsertRow } from './mappers.js';

export class RepositorioDeMesaSupabase implements IMesaRepository {
  constructor(private readonly db: Kysely<SalesDatabase>) {}

  async save(mesa: Mesa, _correlacionId: string): Promise<void> {
    try {
      await this.db.insertInto('sales.mesas').values(mesaToInsertRow(mesa)).execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(mesa: Mesa, _correlacionId: string): Promise<void> {
    try {
      const row = mesaToInsertRow(mesa);
      await this.db
        .updateTable('sales.mesas')
        .set({ estado: row.estado, comanda_activa_id: row.comanda_activa_id })
        .where('id', '=', row.id)
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: MesaId): Promise<Mesa | null> {
    try {
      const row = await this.db
        .selectFrom('sales.mesas')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      if (!row) return null;
      return rowToMesa(row);
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorPunto(puntoDeVentaId: string): Promise<ReadonlyArray<Mesa>> {
    try {
      const rows = await this.db
        .selectFrom('sales.mesas')
        .selectAll()
        .where('punto_de_venta_id', '=', puntoDeVentaId)
        .orderBy('nombre', 'asc')
        .execute();
      return rows.map((r) => rowToMesa(r));
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorEstado(
    puntoDeVentaId: string,
    estado: EstadoDeMesa,
  ): Promise<ReadonlyArray<Mesa>> {
    try {
      const rows = await this.db
        .selectFrom('sales.mesas')
        .selectAll()
        .where('punto_de_venta_id', '=', puntoDeVentaId)
        .where('estado', '=', estado)
        .orderBy('nombre', 'asc')
        .execute();
      return rows.map((r) => rowToMesa(r));
    } catch (e) {
      throw new Err(e);
    }
  }
}
