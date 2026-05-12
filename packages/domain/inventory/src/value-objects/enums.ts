/**
 * Tipos de movimientos de stock en Inventory.
 * Append-only, nunca se modifica un movimiento existente.
 */
export enum TipoMovimiento {
  /** Entrada: compra a proveedor. Incrementa stock, actualiza costo unitario. */
  PURCHASE_IN = 'PURCHASE_IN',

  /** Salida: consumo en orden de producción. Decrementa stock. */
  PRODUCTION_OUT = 'PRODUCTION_OUT',

  /** Merma registrada por Production BC. Decrementa stock, auditable. */
  WASTE = 'WASTE',

  /** Ajuste manual por recount o corrección. Puede incrementar o decrementar. */
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Estados de una Alerta de Stock.
 */
export enum EstadoDeAlerta {
  ABIERTA = 'abierta',
  CERRADA = 'cerrada',
  ANULADA = 'anulada', // Si la categoría es eliminada, la alerta se anula
}

/**
 * Unidades nativas soportadas por Inventory.
 * Cada Ingrediente declaraUna unidad nativa y no puede cambiar.
 * Las conversiones vienen del adaptador ACL.
 */
export enum UnidadNativa {
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  LITRO = 'L',
  MILILITRO = 'mL',
  UNIDAD = 'unidad',
}
