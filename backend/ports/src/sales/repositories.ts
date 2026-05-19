import type {
  Mesa,
  Comanda,
  Cobro,
  Factura,
  MesaId,
  ComandaId,
  CobroId,
  FacturaId,
  EstadoDeMesa,
  EstadoDeComanda,
} from '@zahavi/domain-sales';

// ──────────────────────────────────────────────────────────────
// Repositorio de Mesas
// ──────────────────────────────────────────────────────────────

export interface IMesaRepository {
  save(mesa: Mesa, correlacionId: string): Promise<void>;
  update(mesa: Mesa, correlacionId: string): Promise<void>;
  obtenerPorId(id: MesaId): Promise<Mesa | null>;
  listarPorPunto(puntoDeVentaId: string): Promise<ReadonlyArray<Mesa>>;
  listarPorEstado(puntoDeVentaId: string, estado: EstadoDeMesa): Promise<ReadonlyArray<Mesa>>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Comandas
// ──────────────────────────────────────────────────────────────

export interface IComandaRepository {
  save(comanda: Comanda, correlacionId: string): Promise<void>;
  update(comanda: Comanda, correlacionId: string): Promise<void>;
  obtenerPorId(id: ComandaId): Promise<Comanda | null>;
  listarActivasPorPunto(puntoDeVentaId: string): Promise<ReadonlyArray<Comanda>>;
  listarPorEstado(puntoDeVentaId: string, estado: EstadoDeComanda): Promise<ReadonlyArray<Comanda>>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Cobros
// ──────────────────────────────────────────────────────────────

export interface ICobroRepository {
  save(cobro: Cobro, correlacionId: string): Promise<void>;
  update(cobro: Cobro, correlacionId: string): Promise<void>;
  obtenerPorId(id: CobroId): Promise<Cobro | null>;
  obtenerPorComanda(comandaId: ComandaId): Promise<Cobro | null>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Facturas
// ──────────────────────────────────────────────────────────────

export interface IFacturaRepository {
  save(factura: Factura, correlacionId: string): Promise<void>;
  update(factura: Factura, correlacionId: string): Promise<void>;
  obtenerPorId(id: FacturaId): Promise<Factura | null>;
  obtenerPorCobro(cobroId: CobroId): Promise<Factura | null>;

  /** Genera el siguiente número de factura para el punto de venta. */
  siguienteNumero(puntoDeVentaId: string): Promise<string>;
}
