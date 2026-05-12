import type { Money } from '@zahavi/domain-catalog';
import type { IngredientId } from '@zahavi/domain-catalog';

/**
 * Puerto ACL: consulta de costos de ingredientes hacia el BC Inventory.
 * Catalog no importa el dominio de Inventory; solo pide los costos
 * normalizados a la unidad usada en cada línea de receta.
 */
export interface IConsultorDeCostosDeIngredientes {
  /**
   * Devuelve un Map de `ingredientId.toString()` → `Money` con el costo
   * unitario de cada ingrediente, ya normalizado a la unidad de la línea
   * de receta (el adapter ACL es responsable de la conversión de unidades).
   *
   * Si algún ingrediente no tiene costo registrado, simplemente no aparece
   * en el Map; el caso de uso detecta los faltantes comparando contra las
   * líneas de receta.
   */
  obtenerCostosParaReceta(
    ingredientIds: ReadonlyArray<IngredientId>,
  ): Promise<ReadonlyMap<string, Money>>;
}
