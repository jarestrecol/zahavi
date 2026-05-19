import type {
  OrdenDeProduccion,
  DespachoAPunto,
  OrdenDeProduccionId,
  DespachoId,
  EstadoDeOrdenDeProduccion,
} from '@zahavi/domain-production';

/**
 * Puerto de salida para persistir y consultar Órdenes de Producción.
 *
 * Una orden de producción representa el mandato de fabricar un lote de productos
 * en la planta central. Operaciones de escritura incluyen `correlacionId` para
 * trazabilidad en el audit log.
 */
export interface IOrdenDeProduccionRepository {
  /**
   * Persiste una nueva orden de producción.
   * @param orden - Aggregate con estado inicial.
   * @param correlacionId - ID de correlación del caso de uso para auditoría.
   */
  save(orden: OrdenDeProduccion, correlacionId: string): Promise<void>;

  /**
   * Actualiza el estado de una orden existente.
   * @param orden - Aggregate con el nuevo estado tras ejecutar un comando.
   * @param correlacionId - ID de correlación del caso de uso para auditoría.
   */
  update(orden: OrdenDeProduccion, correlacionId: string): Promise<void>;

  /**
   * Obtiene una orden por su identidad.
   * @returns La orden o `null` si no existe en el tenant activo.
   */
  obtenerPorId(id: OrdenDeProduccionId): Promise<OrdenDeProduccion | null>;

  /** Lista todas las órdenes del tenant activo filtradas por estado. */
  listarPorEstado(estado: EstadoDeOrdenDeProduccion): Promise<ReadonlyArray<OrdenDeProduccion>>;

  /** Lista todas las órdenes asignadas a una planta de producción específica. */
  listarPorPlanta(plantaId: string): Promise<ReadonlyArray<OrdenDeProduccion>>;
}

/**
 * Puerto de salida para persistir y consultar Despachos a punto de venta.
 *
 * Un despacho vincula una orden de producción con un punto de venta destino
 * y registra qué lotes y cantidades se enviaron.
 */
export interface IDespachoRepository {
  /**
   * Persiste un nuevo despacho.
   * @param despacho - Aggregate con estado inicial.
   * @param correlacionId - ID de correlación del caso de uso para auditoría.
   */
  save(despacho: DespachoAPunto, correlacionId: string): Promise<void>;

  /**
   * Actualiza el estado de un despacho existente.
   * @param despacho - Aggregate con el nuevo estado.
   * @param correlacionId - ID de correlación para auditoría.
   */
  update(despacho: DespachoAPunto, correlacionId: string): Promise<void>;

  /**
   * Obtiene un despacho por su identidad.
   * @returns El despacho o `null` si no existe en el tenant activo.
   */
  obtenerPorId(id: DespachoId): Promise<DespachoAPunto | null>;

  /** Lista todos los despachos asociados a una orden de producción. */
  listarPorOrden(ordenId: OrdenDeProduccionId): Promise<ReadonlyArray<DespachoAPunto>>;
}
