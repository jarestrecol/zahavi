import type {
  OrdenDeProduccion,
  DespachoAPunto,
  OrdenDeProduccionId,
  DespachoId,
  EstadoDeOrdenDeProduccion,
} from '@zahavi/domain-production';

// ──────────────────────────────────────────────────────────────
// Repositorio de Órdenes de Producción
// ──────────────────────────────────────────────────────────────

export interface IOrdenDeProduccionRepository {
  save(orden: OrdenDeProduccion, correlacionId: string): Promise<void>;
  update(orden: OrdenDeProduccion, correlacionId: string): Promise<void>;
  obtenerPorId(id: OrdenDeProduccionId): Promise<OrdenDeProduccion | null>;
  listarPorEstado(estado: EstadoDeOrdenDeProduccion): Promise<ReadonlyArray<OrdenDeProduccion>>;
  listarPorPlanta(plantaId: string): Promise<ReadonlyArray<OrdenDeProduccion>>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Despachos
// ──────────────────────────────────────────────────────────────

export interface IDespachoRepository {
  save(despacho: DespachoAPunto, correlacionId: string): Promise<void>;
  update(despacho: DespachoAPunto, correlacionId: string): Promise<void>;
  obtenerPorId(id: DespachoId): Promise<DespachoAPunto | null>;
  listarPorOrden(ordenId: OrdenDeProduccionId): Promise<ReadonlyArray<DespachoAPunto>>;
}
