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

/** Representa una línea de consumo real de ingrediente tras ejecutar la orden. */
export interface LineaDeConsumo {
  readonly ingredientId: string;
  readonly cantidadConsumida: number;
  readonly unidad: string;
}

/**
 * ACL que Production usa para registrar el descuento de inventario cuando
 * una orden se ejecuta. El adapter concreto escribe directamente en
 * `inventory.stock_items` e `inventory.stock_movements` sin pasar por el
 * dominio de Inventory — integración eventual controlada por el caso de uso
 * `EjecutarOrden`.
 */
export interface IDescontadorDeInventario {
  descontarConsumoDeProduccion(
    lineas: ReadonlyArray<LineaDeConsumo>,
    plantaCentralId: string,
    ordenId: string,
    correlacionId: string,
  ): Promise<void>;
}
