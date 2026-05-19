import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  CantidadDespachadaInvalidaError,
  CantidadDespachadaExcedeLoteError,
  DestinoDespachoInvalidoError,
  DespachoEnEstadoInvalidoError,
  CancelacionDeDespachoSinJustificacionError,
} from '../errors/index.js';
import {
  DespachoId,
  OrdenDeProduccionId,
  BusinessUnitIdRef,
  UsuarioIdRef,
} from '../value-objects/ids.js';
import { EstadoDeDespacho } from '../value-objects/enums.js';
import { CodigoDeLote } from '../value-objects/CodigoDeLote.js';
import type {
  ProductionDomainEvent,
  DespachoPreparado,
  DespachoEnviado,
  DespachoEntregado,
  DespachoCancelado,
} from '../events/index.js';

export interface DespachoAPuntoProps {
  readonly id: DespachoId;
  readonly ordenId: OrdenDeProduccionId;
  readonly codigoLote: CodigoDeLote;
  readonly cantidadDespachada: number;
  readonly loteCantidadTotal: number;
  readonly plantaCentralId: BusinessUnitIdRef;
  readonly puntoDeVentaDestinoId: BusinessUnitIdRef;
  readonly estado: EstadoDeDespacho;
  readonly preparadoPor: UsuarioIdRef;
  readonly creadoEn: FechaHora;
}

type DespachoAPuntoPropsOverride = Partial<Pick<DespachoAPuntoProps, 'estado'>>;

/**
 * Aggregate root `DespachoAPunto`.
 *
 * Representa el traslado físico de unidades producidas (de un lote) desde la
 * planta central hacia un punto de venta. El ciclo de vida es:
 *   PREPARADO → EN_TRANSITO → ENTREGADO (terminal)
 *   PREPARADO | EN_TRANSITO → CANCELADO (terminal)
 *
 * Invariantes:
 *   1. `cantidadDespachada` entero > 0.
 *   2. `cantidadDespachada` <= `loteCantidadTotal`.
 *   3. `plantaCentralId` != `puntoDeVentaDestinoId` (no se despacha al mismo lugar).
 *   4. Las transiciones de estado siguen el grafo definido.
 *   5. La cancelación requiere motivo no vacío.
 *
 * El despacho NO descuenta stock de la planta ni añade stock en el punto:
 * al entregar, emite `DespachoEntregado` y la capa de aplicación coordina
 * los movimientos en Inventory de forma eventual.
 */
export class DespachoAPunto {
  readonly id: DespachoId;
  readonly ordenId: OrdenDeProduccionId;
  readonly codigoLote: CodigoDeLote;
  readonly cantidadDespachada: number;
  readonly loteCantidadTotal: number;
  readonly plantaCentralId: BusinessUnitIdRef;
  readonly puntoDeVentaDestinoId: BusinessUnitIdRef;
  readonly estado: EstadoDeDespacho;
  readonly preparadoPor: UsuarioIdRef;
  readonly creadoEn: FechaHora;

  private readonly _events: ProductionDomainEvent[];

  private constructor(props: DespachoAPuntoProps, events: ProductionDomainEvent[] = []) {
    this.id = props.id;
    this.ordenId = props.ordenId;
    this.codigoLote = props.codigoLote;
    this.cantidadDespachada = props.cantidadDespachada;
    this.loteCantidadTotal = props.loteCantidadTotal;
    this.plantaCentralId = props.plantaCentralId;
    this.puntoDeVentaDestinoId = props.puntoDeVentaDestinoId;
    this.estado = props.estado;
    this.preparadoPor = props.preparadoPor;
    this.creadoEn = props.creadoEn;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  /**
   * Crea un despacho en estado PREPARADO.
   *
   * @param loteCantidadTotal - Cantidad total del lote producido (para validar invariante 2).
   */
  static preparar(
    props: {
      id: DespachoId;
      ordenId: OrdenDeProduccionId;
      codigoLote: CodigoDeLote;
      cantidadDespachada: number;
      loteCantidadTotal: number;
      plantaCentralId: BusinessUnitIdRef;
      puntoDeVentaDestinoId: BusinessUnitIdRef;
      preparadoPor: UsuarioIdRef;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<
    DespachoAPunto,
    | CantidadDespachadaInvalidaError
    | CantidadDespachadaExcedeLoteError
    | DestinoDespachoInvalidoError
  > {
    // Invariante 1
    if (!Number.isInteger(props.cantidadDespachada) || props.cantidadDespachada <= 0) {
      return err(new CantidadDespachadaInvalidaError(props.cantidadDespachada));
    }

    // Invariante 2
    if (props.cantidadDespachada > props.loteCantidadTotal) {
      return err(
        new CantidadDespachadaExcedeLoteError(props.cantidadDespachada, props.loteCantidadTotal),
      );
    }

    // Invariante 3
    if (props.plantaCentralId.toString() === props.puntoDeVentaDestinoId.toString()) {
      return err(
        new DestinoDespachoInvalidoError('el destino no puede ser la misma unidad que el origen'),
      );
    }

    const despacho = new DespachoAPunto(
      {
        id: props.id,
        ordenId: props.ordenId,
        codigoLote: props.codigoLote,
        cantidadDespachada: props.cantidadDespachada,
        loteCantidadTotal: props.loteCantidadTotal,
        plantaCentralId: props.plantaCentralId,
        puntoDeVentaDestinoId: props.puntoDeVentaDestinoId,
        estado: EstadoDeDespacho.PREPARADO,
        preparadoPor: props.preparadoPor,
        creadoEn: props.ahora,
      },
      [],
    );

    const evento: DespachoPreparado = {
      eventoId,
      tipo: 'DespachoPreparado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        despachoId: props.id.toString(),
        ordenId: props.ordenId.toString(),
        codigoLote: props.codigoLote.toString(),
        cantidadDespachada: props.cantidadDespachada,
        plantaCentralId: props.plantaCentralId.toString(),
        puntoDeVentaDestinoId: props.puntoDeVentaDestinoId.toString(),
        preparadoPor: props.preparadoPor.toString(),
      },
    };
    despacho._events.push(evento);
    return ok(despacho);
  }

  // ── Comandos ────────────────────────────────────────────────

  /** Transición PREPARADO → EN_TRANSITO. */
  enviar(
    enviadoPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<DespachoAPunto, DespachoEnEstadoInvalidoError> {
    if (this.estado !== EstadoDeDespacho.PREPARADO) {
      return err(new DespachoEnEstadoInvalidoError(this.id.toString(), this.estado, 'enviar'));
    }

    const nuevo = this._con({ estado: EstadoDeDespacho.EN_TRANSITO });
    const evento: DespachoEnviado = {
      eventoId,
      tipo: 'DespachoEnviado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        despachoId: this.id.toString(),
        enviadoPor: enviadoPor.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /**
   * Transición EN_TRANSITO → ENTREGADO.
   * Emite `DespachoEntregado` para que Inventory mueva el stock al punto de venta.
   */
  entregar(
    entregadoPor: UsuarioIdRef,
    recibidoPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<DespachoAPunto, DespachoEnEstadoInvalidoError> {
    if (this.estado !== EstadoDeDespacho.EN_TRANSITO) {
      return err(new DespachoEnEstadoInvalidoError(this.id.toString(), this.estado, 'entregar'));
    }

    const nuevo = this._con({ estado: EstadoDeDespacho.ENTREGADO });
    const evento: DespachoEntregado = {
      eventoId,
      tipo: 'DespachoEntregado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        despachoId: this.id.toString(),
        ordenId: this.ordenId.toString(),
        codigoLote: this.codigoLote.toString(),
        cantidadDespachada: this.cantidadDespachada,
        puntoDeVentaDestinoId: this.puntoDeVentaDestinoId.toString(),
        entregadoPor: entregadoPor.toString(),
        recibidoPor: recibidoPor.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /** Cancela el despacho desde PREPARADO o EN_TRANSITO. Requiere motivo. */
  cancelar(
    motivo: string,
    canceladoPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<
    DespachoAPunto,
    CancelacionDeDespachoSinJustificacionError | DespachoEnEstadoInvalidoError
  > {
    if (motivo.trim().length === 0) {
      return err(new CancelacionDeDespachoSinJustificacionError());
    }

    if (
      this.estado !== EstadoDeDespacho.PREPARADO &&
      this.estado !== EstadoDeDespacho.EN_TRANSITO
    ) {
      return err(new DespachoEnEstadoInvalidoError(this.id.toString(), this.estado, 'cancelar'));
    }

    const estadoAnterior = this.estado;
    const nuevo = this._con({ estado: EstadoDeDespacho.CANCELADO });
    const evento: DespachoCancelado = {
      eventoId,
      tipo: 'DespachoCancelado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        despachoId: this.id.toString(),
        motivo: motivo.trim(),
        canceladoPor: canceladoPor.toString(),
        estadoAnterior,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas ───────────────────────────────────────────────

  esTerminal(): boolean {
    return this.estado === EstadoDeDespacho.ENTREGADO || this.estado === EstadoDeDespacho.CANCELADO;
  }

  pullDomainEvents(): ProductionDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers privados ────────────────────────────────────────

  private _props(): DespachoAPuntoProps {
    return {
      id: this.id,
      ordenId: this.ordenId,
      codigoLote: this.codigoLote,
      cantidadDespachada: this.cantidadDespachada,
      loteCantidadTotal: this.loteCantidadTotal,
      plantaCentralId: this.plantaCentralId,
      puntoDeVentaDestinoId: this.puntoDeVentaDestinoId,
      estado: this.estado,
      preparadoPor: this.preparadoPor,
      creadoEn: this.creadoEn,
    };
  }

  private _con(overrides: DespachoAPuntoPropsOverride): DespachoAPunto {
    return new DespachoAPunto({ ...this._props(), ...overrides }, []);
  }

  static reconstituir(props: DespachoAPuntoProps): DespachoAPunto {
    return new DespachoAPunto(props, []);
  }
}
