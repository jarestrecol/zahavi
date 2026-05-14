import type { FechaHora } from '@zahavi/domain-shared-kernel';

// ── Mesa ─────────────────────────────────────────────────────────

export interface MesaConfigurada {
  readonly type: 'MesaConfigurada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly nombre: string;
  readonly puntoDeVentaId: string;
}

export interface MesaOcupada {
  readonly type: 'MesaOcupada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly comandaId: string;
}

export interface MesaLiberada {
  readonly type: 'MesaLiberada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
}

export interface MesaEnCobro {
  readonly type: 'MesaEnCobro';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
}

export type MesaDomainEvent = MesaConfigurada | MesaOcupada | MesaLiberada | MesaEnCobro;

// ── Comanda ──────────────────────────────────────────────────────

export interface ComandaCreada {
  readonly type: 'ComandaCreada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly mesaId: string;
  readonly puntoDeVentaId: string;
  readonly tomadaPor: string;
}

export interface LineaAgregadaAComanda {
  readonly type: 'LineaAgregadaAComanda';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly lineaId: string;
  readonly varianteId: string;
  readonly cantidad: number;
}

export interface LineaCancelada {
  readonly type: 'LineaCancelada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly lineaId: string;
}

export interface ComandaEnviada {
  readonly type: 'ComandaEnviada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
}

export interface ComandaEnPreparacion {
  readonly type: 'ComandaEnPreparacion';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
}

export interface ComandaLista {
  readonly type: 'ComandaLista';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
}

export interface ComandaCerrada {
  readonly type: 'ComandaCerrada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly cerradaPor: string;
  readonly totalConIVA: number;
}

export interface ComandaCancelada {
  readonly type: 'ComandaCancelada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly canceladaPor: string;
  readonly motivo: string;
}

export type ComandaDomainEvent =
  | ComandaCreada
  | LineaAgregadaAComanda
  | LineaCancelada
  | ComandaEnviada
  | ComandaEnPreparacion
  | ComandaLista
  | ComandaCerrada
  | ComandaCancelada;

// ── Cobro ────────────────────────────────────────────────────────

export interface CobroCreado {
  readonly type: 'CobroCreado';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly comandaId: string;
  readonly cobradoPor: string;
}

export interface CobroProcesado {
  readonly type: 'CobroProcesado';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly totalCobrado: number;
  readonly cambio: number;
}

export interface CobroAnulado {
  readonly type: 'CobroAnulado';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly motivo: string;
}

export type CobroDomainEvent = CobroCreado | CobroProcesado | CobroAnulado;

// ── Factura ──────────────────────────────────────────────────────

export interface FacturaEmitida {
  readonly type: 'FacturaEmitida';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly cobroId: string;
  readonly numero: string;
  readonly total: number;
}

export interface FacturaAnulada {
  readonly type: 'FacturaAnulada';
  readonly aggregateId: string;
  readonly correlacionId: string;
  readonly ocurridoEn: FechaHora;
  readonly motivo: string;
}

export type FacturaDomainEvent = FacturaEmitida | FacturaAnulada;

// ── Union ────────────────────────────────────────────────────────

export type SalesDomainEvent =
  | MesaDomainEvent
  | ComandaDomainEvent
  | CobroDomainEvent
  | FacturaDomainEvent;
