import type { Kysely } from 'kysely';
import type { IConsultorDeProductoParaVentas, DatosDeVentaDeProducto } from '@zahavi/ports';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from '../catalog/schema.js';

/**
 * ACL: consulta `catalog.product_variants` y devuelve los datos de venta
 * que el BC Sales necesita, sin exponer ningún aggregate del BC Catalog.
 *
 * Nota: `tasa_iva` no existe aún en el schema de catalog — se devuelve 0
 * como default MVP hasta que la migración agregue la columna (D-012).
 */
export class ConsultorDeProductoSupabase implements IConsultorDeProductoParaVentas {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  async obtenerDatosDeVenta(varianteId: string): Promise<DatosDeVentaDeProducto | null> {
    try {
      const row = await this.db
        .selectFrom('catalog.product_variants')
        .select(['id', 'nombre', 'precio_cop'])
        .where('id', '=', varianteId)
        .executeTakeFirst();
      if (!row) return null;
      return {
        varianteId: row.id,
        nombre: row.nombre,
        precioUnitario: row.precio_cop,
        tasaIVA: 0,
      };
    } catch (e) {
      throw new Err(e);
    }
  }
}
