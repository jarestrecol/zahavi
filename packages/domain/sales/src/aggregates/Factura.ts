import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import { FacturaYaAnuladaError, CancelacionSinMotivoError } from '../errors/index.js';
import { FacturaId, CobroId, ComandaId, BusinessUnitIdRef } from '../value-objects/ids.js';
import { EstadoDeFactura } from '../value-objects/enums.js';
import { Dinero } from '../value-objects/Dinero.js';
import { NumeroFactura } from '../value-objects/NumeroFactura.js';
import { FacturaLinea } from '../value-objects/FacturaLinea.js';
import type { FacturaDomainEvent, FacturaEmitida, FacturaAnulada } from '../events/index.js';

export interface FacturaProps {
  readonly id: FacturaId;
  readonly cobroId: CobroId;
  readonly comandaId: ComandaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly numero: NumeroFactura;
  readonly lineas: ReadonlyArray<FacturaLinea>;
  readonly subtotal: Dinero;
  readonly totalIVA: Dinero;
  readonly total: Dinero;
  readonly estado: EstadoDeFactura;
  readonly emitidaEn: FechaHora;
  readonly anuladaEn: FechaHora | null;
  readonly motivoAnulacion: string | null;
}

type FacturaOverride = Partial<Pick<FacturaProps, 'estado' | 'anuladaEn' | 'motivoAnulacion'>>;

/**
 * Aggregate root `Factura`.
 *
 * Es un documento de cobro interno (recibo). La integración con DIAN queda
 * para la Iteración 7 — Refinamiento.
 *
 * Invariantes:
 * - La factura es inmutable una vez emitida, salvo para anulación.
 * - Una factura ANULADA no puede anularse de nuevo.
 * - La anulación requiere un motivo.
 * - subtotal + totalIVA = total (calculado al emitir, snapshot).
 */
export class Factura {
  readonly id: FacturaId;
  readonly cobroId: CobroId;
  readonly comandaId: ComandaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly numero: NumeroFactura;
  readonly lineas: ReadonlyArray<FacturaLinea>;
  readonly subtotal: Dinero;
  readonly totalIVA: Dinero;
  readonly total: Dinero;
  readonly estado: EstadoDeFactura;
  readonly emitidaEn: FechaHora;
  readonly anuladaEn: FechaHora | null;
  readonly motivoAnulacion: string | null;
  readonly events: ReadonlyArray<FacturaDomainEvent>;

  private constructor(props: FacturaProps, events: ReadonlyArray<FacturaDomainEvent> = []) {
    this.id = props.id;
    this.cobroId = props.cobroId;
    this.comandaId = props.comandaId;
    this.puntoDeVentaId = props.puntoDeVentaId;
    this.numero = props.numero;
    this.lineas = props.lineas;
    this.subtotal = props.subtotal;
    this.totalIVA = props.totalIVA;
    this.total = props.total;
    this.estado = props.estado;
    this.emitidaEn = props.emitidaEn;
    this.anuladaEn = props.anuladaEn;
    this.motivoAnulacion = props.motivoAnulacion;
    this.events = events;
  }

  private with(override: FacturaOverride, event: FacturaDomainEvent): Factura {
    return new Factura({ ...this, ...override }, [...this.events, event]);
  }

  // ── Factory ─────────────────────────────────────────────────

  /**
   * Emite una factura a partir de un Cobro PROCESADO.
   * Las líneas son un snapshot inmutable de la comanda.
   */
  static emitir(
    datos: {
      id: FacturaId;
      cobroId: CobroId;
      comandaId: ComandaId;
      puntoDeVentaId: BusinessUnitIdRef;
      numero: NumeroFactura;
      lineas: FacturaLinea[];
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Factura {
    const subtotal = datos.lineas.reduce((acc, l) => acc.sumar(l.subtotalSinIVA), Dinero.cero());
    const totalIVA = datos.lineas.reduce((acc, l) => acc.sumar(l.subtotalIVA), Dinero.cero());
    const total = subtotal.sumar(totalIVA);

    const props: FacturaProps = {
      id: datos.id,
      cobroId: datos.cobroId,
      comandaId: datos.comandaId,
      puntoDeVentaId: datos.puntoDeVentaId,
      numero: datos.numero,
      lineas: datos.lineas,
      subtotal,
      totalIVA,
      total,
      estado: EstadoDeFactura.EMITIDA,
      emitidaEn: datos.ahora,
      anuladaEn: null,
      motivoAnulacion: null,
    };
    const event: FacturaEmitida = {
      type: 'FacturaEmitida',
      aggregateId: datos.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      cobroId: datos.cobroId.toString(),
      numero: datos.numero.toString(),
      total: total.valor,
    };
    return new Factura(props, [event]);
  }

  static reconstituir(props: FacturaProps): Factura {
    return new Factura(props, []);
  }

  // ── Comandos ────────────────────────────────────────────────

  anular(
    motivo: string,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Factura, FacturaYaAnuladaError | CancelacionSinMotivoError> {
    if (this.estado === EstadoDeFactura.ANULADA) return err(new FacturaYaAnuladaError());
    if (!motivo.trim()) return err(new CancelacionSinMotivoError());
    const event: FacturaAnulada = {
      type: 'FacturaAnulada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      motivo,
    };
    return ok(
      this.with(
        { estado: EstadoDeFactura.ANULADA, anuladaEn: ahora, motivoAnulacion: motivo },
        event,
      ),
    );
  }
}
