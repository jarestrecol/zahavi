import type { UnidadDeMedida } from '@zahavi/domain-production';

/**
 * Línea de receta normalizada en términos del BC Production.
 * La capa de aplicación recibe esto desde el ACL que consulta Catalog.
 * La unidad ya está convertida a `UnidadDeMedida` (unidad nativa de Inventory).
 */
export interface LineaDeRecetaParaProduccion {
  readonly ingredientId: string;
  readonly cantidadPorUnidad: number;
  readonly unidad: UnidadDeMedida;
}

/**
 * ACL (Anti-Corruption Layer) que Production usa para obtener la receta de
 * Catalog sin importar aggregates del BC Catalog.
 * El adapter concreto (en persistence-supabase) hace la consulta SQL y
 * convierte los datos a este DTO de Production.
 */
export interface IConsultorDeRecetaDeProduccion {
  obtenerLineasDeReceta(recetaId: string): Promise<LineaDeRecetaParaProduccion[]>;
}
