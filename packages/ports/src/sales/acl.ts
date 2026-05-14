/**
 * DTO con los datos de un producto necesarios para registrar una venta.
 * El adapter concreto consulta `catalog.product_variants` y entrega este DTO.
 * El BC Sales no importa ningún aggregate del BC Catalog.
 */
export interface DatosDeVentaDeProducto {
  readonly varianteId: string;
  readonly nombre: string;
  /** Precio unitario en COP, entero sin decimales. */
  readonly precioUnitario: number;
  /** Tasa de IVA: 0 ó 0.19. */
  readonly tasaIVA: number;
}

/**
 * ACL (Anti-Corruption Layer) que Sales usa para obtener datos de un producto
 * desde el BC Catalog sin importar sus aggregates.
 *
 * El caso de uso `AgregarLineaAComanda` invoca este puerto antes de llamar al
 * dominio, pasando `DatosDeProductoParaLinea` ya resueltos al aggregate Comanda.
 */
export interface IConsultorDeProductoParaVentas {
  obtenerDatosDeVenta(varianteId: string): Promise<DatosDeVentaDeProducto | null>;
}
