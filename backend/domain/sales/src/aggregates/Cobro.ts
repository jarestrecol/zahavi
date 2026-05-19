import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  CobrosIncompletosError,
  CobroYaProcesadoError,
  CobroNoAnulableError,
  PagosVaciosError,
  CancelacionSinMotivoError,
} from '../errors/index.js';
import { CobroId, ComandaId, BusinessUnitIdRef, UsuarioIdRef } from '../value-objects/ids.js';
import { EstadoDeCobro } from '../value-objects/enums.js';
import { Dinero } from '../value-objects/Dinero.js';
import { PagoDetalle } from '../value-objects/PagoDetalle.js';
import type {
  CobroDomainEvent,
  CobroCreado,
  CobroProcesado,
  CobroAnulado,
} from '../events/index.js';

export interface CobroProps {
  readonly id: CobroId;
  readonly comandaId: ComandaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly totalComanda: Dinero;
  readonly pagos: ReadonlyArray<PagoDetalle>;
  readonly totalCobrado: Dinero;
  readonly cambio: Dinero;
  readonly estado: EstadoDeCobro;
  readonly cobradoPor: UsuarioIdRef;
  readonly creadoEn: FechaHora;
  readonly procesadoEn: FechaHora | null;
  readonly motivoAnulacion: string | null;
}

type CobroOverride = Partial<
  Pick<
    CobroProps,
    'estado' | 'pagos' | 'totalCobrado' | 'cambio' | 'procesadoEn' | 'motivoAnulacion'
  >
>;

/**
 * Aggregate root `Cobro`.
 *
 * Invariantes:
 * - Para procesar, el total cobrado (suma de pagos) debe cubrir el total de la comanda.
 * - El cambio es la diferencia `max(0, totalCobrado - totalComanda)`.
 * - Un Cobro PROCESADO no puede procesarse de nuevo.
 * - Un Cobro ANULADO o FALLIDO no puede anularse de nuevo.
 * - Se requiere al menos un pago para procesar.
 */
export class Cobro {
  readonly id: CobroId;
  readonly comandaId: ComandaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly totalComanda: Dinero;
  readonly pagos: ReadonlyArray<PagoDetalle>;
  readonly totalCobrado: Dinero;
  readonly cambio: Dinero;
  readonly estado: EstadoDeCobro;
  readonly cobradoPor: UsuarioIdRef;
  readonly creadoEn: FechaHora;
  readonly procesadoEn: FechaHora | null;
  readonly motivoAnulacion: string | null;
  readonly events: ReadonlyArray<CobroDomainEvent>;

  private constructor(props: CobroProps, events: ReadonlyArray<CobroDomainEvent> = []) {
    this.id = props.id;
    this.comandaId = props.comandaId;
    this.puntoDeVentaId = props.puntoDeVentaId;
    this.totalComanda = props.totalComanda;
    this.pagos = props.pagos;
    this.totalCobrado = props.totalCobrado;
    this.cambio = props.cambio;
    this.estado = props.estado;
    this.cobradoPor = props.cobradoPor;
    this.creadoEn = props.creadoEn;
    this.procesadoEn = props.procesadoEn;
    this.motivoAnulacion = props.motivoAnulacion;
    this.events = events;
  }

  private with(override: CobroOverride, event: CobroDomainEvent): Cobro {
    return new Cobro({ ...this, ...override }, [...this.events, event]);
  }

  // ── Factory ─────────────────────────────────────────────────

  static crear(
    datos: {
      id: CobroId;
      comandaId: ComandaId;
      puntoDeVentaId: BusinessUnitIdRef;
      totalComanda: Dinero;
      cobradoPor: UsuarioIdRef;
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Cobro {
    const props: CobroProps = {
      id: datos.id,
      comandaId: datos.comandaId,
      puntoDeVentaId: datos.puntoDeVentaId,
      totalComanda: datos.totalComanda,
      pagos: [],
      totalCobrado: Dinero.cero(),
      cambio: Dinero.cero(),
      estado: EstadoDeCobro.PENDIENTE,
      cobradoPor: datos.cobradoPor,
      creadoEn: datos.ahora,
      procesadoEn: null,
      motivoAnulacion: null,
    };
    const event: CobroCreado = {
      type: 'CobroCreado',
      aggregateId: datos.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      comandaId: datos.comandaId.toString(),
      cobradoPor: datos.cobradoPor.toString(),
    };
    return new Cobro(props, [event]);
  }

  static reconstituir(props: CobroProps): Cobro {
    return new Cobro(props, []);
  }

  // ── Comandos ────────────────────────────────────────────────

  /**
   * Procesa el cobro con los pagos recibidos.
   *
   * @param pagos - Al menos un PagoDetalle. La suma debe cubrir el total de la comanda.
   */
  procesar(
    pagos: PagoDetalle[],
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Cobro, CobroYaProcesadoError | PagosVaciosError | CobrosIncompletosError> {
    if (this.estado === EstadoDeCobro.PROCESADO) return err(new CobroYaProcesadoError());
    if (pagos.length === 0) return err(new PagosVaciosError());

    const totalCobrado = pagos.reduce((acc, p) => acc.sumar(p.monto), Dinero.cero());
    if (totalCobrado.valor < this.totalComanda.valor) {
      return err(new CobrosIncompletosError(this.totalComanda.valor, totalCobrado.valor));
    }

    const restaResult = totalCobrado.restar(this.totalComanda);
    const cambio = restaResult.ok ? restaResult.value : Dinero.cero();

    const event: CobroProcesado = {
      type: 'CobroProcesado',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      totalCobrado: totalCobrado.valor,
      cambio: cambio.valor,
    };
    return ok(
      this.with(
        {
          estado: EstadoDeCobro.PROCESADO,
          pagos,
          totalCobrado,
          cambio,
          procesadoEn: ahora,
        },
        event,
      ),
    );
  }

  /** Anula el cobro (solo desde PENDIENTE o PROCESADO). */
  anular(
    motivo: string,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Cobro, CobroNoAnulableError | CancelacionSinMotivoError> {
    if (this.estado === EstadoDeCobro.ANULADO || this.estado === EstadoDeCobro.FALLIDO) {
      return err(new CobroNoAnulableError(this.estado));
    }
    if (!motivo.trim()) return err(new CancelacionSinMotivoError());
    const event: CobroAnulado = {
      type: 'CobroAnulado',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      motivo,
    };
    return ok(this.with({ estado: EstadoDeCobro.ANULADO, motivoAnulacion: motivo }, event));
  }
}
