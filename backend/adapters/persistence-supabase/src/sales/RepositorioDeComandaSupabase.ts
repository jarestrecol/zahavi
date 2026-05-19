import type { Kysely } from 'kysely';
import type { IComandaRepository } from '@zahavi/ports';
import type { Comanda, ComandaId, EstadoDeComanda } from '@zahavi/domain-sales';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { SalesDatabase, LineaComandaJson } from './schema.js';
import { rowToComanda, comandaToInsertRow, parseJsonb } from './mappers.js';

const ESTADOS_ACTIVOS: EstadoDeComanda[] = [
  'ABIERTA',
  'ENVIADA',
  'EN_PREPARACION',
  'LISTA',
] as EstadoDeComanda[];

export class RepositorioDeComandaSupabase implements IComandaRepository {
  constructor(private readonly db: Kysely<SalesDatabase>) {}

  async save(comanda: Comanda, _correlacionId: string): Promise<void> {
    try {
      await this.db.insertInto('sales.comandas').values(comandaToInsertRow(comanda)).execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(comanda: Comanda, _correlacionId: string): Promise<void> {
    try {
      const row = comandaToInsertRow(comanda);
      await this.db
        .updateTable('sales.comandas')
        .set({
          estado: row.estado,
          lineas: row.lineas,
          cerrada_por: row.cerrada_por,
          motivo_cancelacion: row.motivo_cancelacion,
          cerrada_en: row.cerrada_en,
        })
        .where('id', '=', row.id)
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: ComandaId): Promise<Comanda | null> {
    try {
      const row = await this.db
        .selectFrom('sales.comandas')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      if (!row) return null;
      return rowToComanda({
        ...row,
        lineas: parseJsonb<LineaComandaJson[]>(row.lineas),
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarActivasPorPunto(puntoDeVentaId: string): Promise<ReadonlyArray<Comanda>> {
    try {
      const rows = await this.db
        .selectFrom('sales.comandas')
        .selectAll()
        .where('punto_de_venta_id', '=', puntoDeVentaId)
        .where('estado', 'in', ESTADOS_ACTIVOS)
        .orderBy('abierta_en', 'desc')
        .execute();
      return rows.map((r) =>
        rowToComanda({ ...r, lineas: parseJsonb<LineaComandaJson[]>(r.lineas) }),
      );
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPorEstado(
    puntoDeVentaId: string,
    estado: EstadoDeComanda,
  ): Promise<ReadonlyArray<Comanda>> {
    try {
      const rows = await this.db
        .selectFrom('sales.comandas')
        .selectAll()
        .where('punto_de_venta_id', '=', puntoDeVentaId)
        .where('estado', '=', estado)
        .orderBy('abierta_en', 'desc')
        .execute();
      return rows.map((r) =>
        rowToComanda({ ...r, lineas: parseJsonb<LineaComandaJson[]>(r.lineas) }),
      );
    } catch (e) {
      throw new Err(e);
    }
  }
}
