import type { Kysely } from 'kysely';
import type { IFacturaRepository } from '@zahavi/ports';
import type { Factura, FacturaId, CobroId } from '@zahavi/domain-sales';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { SalesDatabase, FacturaLineaJson } from './schema.js';
import { rowToFactura, facturaToInsertRow, parseJsonb } from './mappers.js';

export class RepositorioDeFacturaSupabase implements IFacturaRepository {
  constructor(private readonly db: Kysely<SalesDatabase>) {}

  async save(factura: Factura, _correlacionId: string): Promise<void> {
    try {
      await this.db.insertInto('sales.facturas').values(facturaToInsertRow(factura)).execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(factura: Factura, _correlacionId: string): Promise<void> {
    try {
      const row = facturaToInsertRow(factura);
      await this.db
        .updateTable('sales.facturas')
        .set({
          estado: row.estado,
          anulada_en: row.anulada_en,
          motivo_anulacion: row.motivo_anulacion,
        })
        .where('id', '=', row.id)
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorId(id: FacturaId): Promise<Factura | null> {
    try {
      const row = await this.db
        .selectFrom('sales.facturas')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      if (!row) return null;
      return rowToFactura({ ...row, lineas: parseJsonb<FacturaLineaJson[]>(row.lineas) });
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorCobro(cobroId: CobroId): Promise<Factura | null> {
    try {
      const row = await this.db
        .selectFrom('sales.facturas')
        .selectAll()
        .where('cobro_id', '=', cobroId.toString())
        .executeTakeFirst();
      if (!row) return null;
      return rowToFactura({ ...row, lineas: parseJsonb<FacturaLineaJson[]>(row.lineas) });
    } catch (e) {
      throw new Err(e);
    }
  }

  /**
   * Genera el siguiente número de factura para el punto de venta.
   * Formato: FAC-YYYY-NNNNN (contador por punto de venta + año).
   */
  async siguienteNumero(puntoDeVentaId: string): Promise<string> {
    try {
      const anio = new Date().getFullYear();
      const prefix = `FAC-${anio}-`;
      const result = await this.db
        .selectFrom('sales.facturas')
        .select((eb) => eb.fn.count<number>('id').as('total'))
        .where('punto_de_venta_id', '=', puntoDeVentaId)
        .where('numero', 'like', `${prefix}%`)
        .executeTakeFirst();
      const siguiente = ((result?.total ?? 0) as number) + 1;
      return `${prefix}${String(siguiente).padStart(5, '0')}`;
    } catch (e) {
      throw new Err(e);
    }
  }
}
