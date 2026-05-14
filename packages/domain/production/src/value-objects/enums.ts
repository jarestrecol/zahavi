/**
 * Estados del ciclo de vida de una `OrdenDeProduccion`.
 *
 * Transiciones permitidas:
 *   PLANIFICADA → RESERVADA → EN_EJECUCION → EJECUTADA
 *   PLANIFICADA | RESERVADA → CANCELADA
 *
 * Estados terminales: EJECUTADA, CANCELADA. Ningún estado vuelve atrás.
 */
export enum EstadoDeOrdenDeProduccion {
  PLANIFICADA = 'PLANIFICADA',
  RESERVADA = 'RESERVADA',
  EN_EJECUCION = 'EN_EJECUCION',
  EJECUTADA = 'EJECUTADA',
  CANCELADA = 'CANCELADA',
}

/**
 * Estados del ciclo de vida de un `Despacho`.
 *
 * Transiciones permitidas:
 *   PREPARADO → EN_TRANSITO → ENTREGADO
 *   PREPARADO | EN_TRANSITO → CANCELADO
 *
 * Estados terminales: ENTREGADO, CANCELADO.
 */
export enum EstadoDeDespacho {
  PREPARADO = 'PREPARADO',
  EN_TRANSITO = 'EN_TRANSITO',
  ENTREGADO = 'ENTREGADO',
  CANCELADO = 'CANCELADO',
}

/**
 * Unidades soportadas en Production para cantidades de ingredientes en el BOM.
 *
 * Debe alinearse con `UnidadNativa` de Inventory. El adapter ACL desde
 * Catalog → Production convierte la unidad de la receta a la unidad nativa
 * del ingrediente antes de construir el BOM.
 */
export enum UnidadDeMedida {
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  LITRO = 'L',
  MILILITRO = 'mL',
  UNIDAD = 'unidad',
}
