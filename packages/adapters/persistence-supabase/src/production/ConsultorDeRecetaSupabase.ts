import type { Kysely } from 'kysely';
import type { IConsultorDeRecetaDeProduccion, LineaDeRecetaParaProduccion } from '@zahavi/ports';
import { UnidadDeMedida } from '@zahavi/domain-production';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from '../catalog/schema.js';

// Mapa de códigos de unidad almacenados en catalog.recipe_lines → UnidadDeMedida de Production.
// 'und' es el alias usado en el seed data; se normaliza a 'unidad'.
const UNIDAD_MAP: Record<string, UnidadDeMedida> = {
  kg: UnidadDeMedida.KILOGRAMO,
  g: UnidadDeMedida.GRAMO,
  L: UnidadDeMedida.LITRO,
  mL: UnidadDeMedida.MILILITRO,
  unidad: UnidadDeMedida.UNIDAD,
  und: UnidadDeMedida.UNIDAD,
};

function mapUnidad(unidad: string): UnidadDeMedida {
  const mapped = UNIDAD_MAP[unidad.toUpperCase()];
  if (!mapped) throw new Error(`ConsultorDeRecetaSupabase: unidad desconocida "${unidad}"`);
  return mapped;
}

/**
 * ACL (Anti-Corruption Layer): consulta las líneas de receta del BC Catalog
 * y las traduce al DTO `LineaDeRecetaParaProduccion` que entiende Production.
 *
 * Solo lee `catalog.recipe_lines`; no importa ningún aggregate de Catalog.
 */
export class ConsultorDeRecetaSupabase implements IConsultorDeRecetaDeProduccion {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  async obtenerLineasDeReceta(recetaId: string): Promise<LineaDeRecetaParaProduccion[]> {
    try {
      const rows = await this.db
        .selectFrom('catalog.recipe_lines')
        .select(['ingredient_id', 'cantidad_valor', 'unidad'])
        .where('recipe_id', '=', recetaId)
        .execute();

      return rows.map((row) => ({
        ingredientId: row.ingredient_id,
        cantidadPorUnidad: Number(row.cantidad_valor),
        unidad: mapUnidad(row.unidad),
      }));
    } catch (e) {
      throw new Err(e);
    }
  }
}
