import type { DomainEvent } from '@zahavi/domain-shared-kernel';

export type { DomainEvent };

// ──────────────────────────────────────────────────────────────
// Eventos de la Orden de Producción
// ──────────────────────────────────────────────────────────────

export interface OrdenDeProduccionCreada extends DomainEvent {
  readonly tipo: 'OrdenDeProduccionCreada';
  readonly payload: {
    readonly ordenId: string;
    readonly varianteId: string;
    readonly recetaId: string;
    readonly plantaCentralId: string;
    readonly cantidadAProducir: number;
    readonly creadaPor: string;
  };
}

/**
 * Emitido cuando el caso de uso calcula el BOM a partir de la receta
 * (provista por Catalog vía ACL) y lo cuela en la OdP.
 */
export interface BOMCalculadoParaOrden extends DomainEvent {
  readonly tipo: 'BOMCalculadoParaOrden';
  readonly payload: {
    readonly ordenId: string;
    readonly lineas: ReadonlyArray<{
      readonly lineaId: string;
      readonly ingredientId: string;
      readonly cantidadRequerida: number;
      readonly unidad: string;
    }>;
  };
}

/**
 * Anuncia que Inventory debe apartar los ingredientes del BOM en la planta
 * central. La reserva efectiva la coordina la capa de aplicación.
 */
export interface IngredientesReservadosParaOrden extends DomainEvent {
  readonly tipo: 'IngredientesReservadosParaOrden';
  readonly payload: {
    readonly ordenId: string;
    readonly plantaCentralId: string;
    readonly lineas: ReadonlyArray<{
      readonly ingredientId: string;
      readonly cantidadReservada: number;
      readonly unidad: string;
    }>;
  };
}

export interface OrdenDeProduccionIniciada extends DomainEvent {
  readonly tipo: 'OrdenDeProduccionIniciada';
  readonly payload: {
    readonly ordenId: string;
    readonly iniciadaPor: string;
  };
}

export interface MermaDeProduccionRegistrada extends DomainEvent {
  readonly tipo: 'MermaDeProduccionRegistrada';
  readonly payload: {
    readonly ordenId: string;
    readonly mermaId: string;
    readonly ingredientId: string;
    readonly cantidad: number;
    readonly unidad: string;
    readonly motivo: string;
    readonly registradaPor: string;
  };
}

/**
 * Evento central: la OdP terminó. Inventory debe descontar el consumo real de
 * ingredientes (BOM - merma reportada en otros eventos) y registrar las
 * mermas como `WASTE`. La consistencia es eventual.
 */
export interface OrdenDeProduccionEjecutada extends DomainEvent {
  readonly tipo: 'OrdenDeProduccionEjecutada';
  readonly payload: {
    readonly ordenId: string;
    readonly varianteId: string;
    readonly plantaCentralId: string;
    readonly cantidadPlaneada: number;
    readonly cantidadProducida: number;
    readonly codigoLote: string;
    readonly consumoReal: ReadonlyArray<{
      readonly ingredientId: string;
      readonly cantidadConsumida: number;
      readonly unidad: string;
    }>;
    readonly ejecutadaPor: string;
  };
}

export interface OrdenDeProduccionCancelada extends DomainEvent {
  readonly tipo: 'OrdenDeProduccionCancelada';
  readonly payload: {
    readonly ordenId: string;
    readonly motivo: string;
    readonly canceladaPor: string;
    readonly estadoAnterior: string;
  };
}

// ──────────────────────────────────────────────────────────────
// Eventos del Despacho
// ──────────────────────────────────────────────────────────────

export interface DespachoPreparado extends DomainEvent {
  readonly tipo: 'DespachoPreparado';
  readonly payload: {
    readonly despachoId: string;
    readonly ordenId: string;
    readonly codigoLote: string;
    readonly cantidadDespachada: number;
    readonly plantaCentralId: string;
    readonly puntoDeVentaDestinoId: string;
    readonly preparadoPor: string;
  };
}

export interface DespachoEnviado extends DomainEvent {
  readonly tipo: 'DespachoEnviado';
  readonly payload: {
    readonly despachoId: string;
    readonly enviadoPor: string;
  };
}

export interface DespachoEntregado extends DomainEvent {
  readonly tipo: 'DespachoEntregado';
  readonly payload: {
    readonly despachoId: string;
    readonly ordenId: string;
    readonly codigoLote: string;
    readonly cantidadDespachada: number;
    readonly puntoDeVentaDestinoId: string;
    readonly entregadoPor: string;
    readonly recibidoPor: string;
  };
}

export interface DespachoCancelado extends DomainEvent {
  readonly tipo: 'DespachoCancelado';
  readonly payload: {
    readonly despachoId: string;
    readonly motivo: string;
    readonly canceladoPor: string;
    readonly estadoAnterior: string;
  };
}

// ──────────────────────────────────────────────────────────────
// Unión: todos los eventos del BC Production
// ──────────────────────────────────────────────────────────────

export type ProductionDomainEvent =
  | OrdenDeProduccionCreada
  | BOMCalculadoParaOrden
  | IngredientesReservadosParaOrden
  | OrdenDeProduccionIniciada
  | MermaDeProduccionRegistrada
  | OrdenDeProduccionEjecutada
  | OrdenDeProduccionCancelada
  | DespachoPreparado
  | DespachoEnviado
  | DespachoEntregado
  | DespachoCancelado;
