import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import { TransicionDeMesaInvalidaError, MesaYaOcupadaError } from '../errors/index.js';
import { MesaId, ComandaId, BusinessUnitIdRef, UsuarioIdRef } from '../value-objects/ids.js';
import { EstadoDeMesa, TipoDeMesa } from '../value-objects/enums.js';
import { NombreMesa } from '../value-objects/NombreMesa.js';
import type {
  MesaDomainEvent,
  MesaConfigurada,
  MesaOcupada,
  MesaLiberada,
  MesaEnCobro,
} from '../events/index.js';

export interface MesaProps {
  readonly id: MesaId;
  readonly nombre: NombreMesa;
  readonly tipo: TipoDeMesa;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly estado: EstadoDeMesa;
  readonly comandaActivaId: ComandaId | null;
  readonly creadaEn: FechaHora;
}

type MesaOverride = Partial<Pick<MesaProps, 'estado' | 'comandaActivaId'>>;

/**
 * Aggregate root `Mesa`.
 *
 * Invariantes:
 * - OCUPADA implica comandaActivaId != null.
 * - LIBRE, RESERVADA, EN_COBRO implican comandaActivaId == null (salvo EN_COBRO que lo conserva).
 * - Solo puede haber UNA comanda activa por mesa.
 *
 * Transiciones válidas:
 * - LIBRE → OCUPADA (ocupar)
 * - LIBRE → RESERVADA (reservar)
 * - RESERVADA → LIBRE (cancelarReserva)
 * - RESERVADA → OCUPADA (ocupar)
 * - OCUPADA → EN_COBRO (iniciarCobro)
 * - OCUPADA → LIBRE (liberar — cancelación directa sin cobro)
 * - EN_COBRO → LIBRE (liberar — cobro completado o cancelado)
 * - EN_COBRO → OCUPADA (cancelarCobro — vuelve a estar activa)
 */
export class Mesa {
  readonly id: MesaId;
  readonly nombre: NombreMesa;
  readonly tipo: TipoDeMesa;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly estado: EstadoDeMesa;
  readonly comandaActivaId: ComandaId | null;
  readonly creadaEn: FechaHora;
  readonly events: ReadonlyArray<MesaDomainEvent>;

  private constructor(props: MesaProps, events: ReadonlyArray<MesaDomainEvent> = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.tipo = props.tipo;
    this.puntoDeVentaId = props.puntoDeVentaId;
    this.estado = props.estado;
    this.comandaActivaId = props.comandaActivaId;
    this.creadaEn = props.creadaEn;
    this.events = events;
  }

  private with(override: MesaOverride, event: MesaDomainEvent): Mesa {
    return new Mesa({ ...this, ...override }, [...this.events, event]);
  }

  // ── Factories ────────────────────────────────────────────────

  /**
   * Crea una mesa del catálogo (configurada por ADMIN).
   * Nace en estado LIBRE.
   */
  static configurar(
    datos: {
      id: MesaId;
      nombre: NombreMesa;
      puntoDeVentaId: BusinessUnitIdRef;
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Mesa {
    const props: MesaProps = {
      id: datos.id,
      nombre: datos.nombre,
      tipo: TipoDeMesa.NORMAL,
      puntoDeVentaId: datos.puntoDeVentaId,
      estado: EstadoDeMesa.LIBRE,
      comandaActivaId: null,
      creadaEn: datos.ahora,
    };
    const event: MesaConfigurada = {
      type: 'MesaConfigurada',
      aggregateId: datos.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      nombre: datos.nombre.toString(),
      puntoDeVentaId: datos.puntoDeVentaId.toString(),
    };
    return new Mesa(props, [event]);
  }

  /**
   * Crea una mesa ad-hoc (creada por mesero en el momento).
   * Nace directamente en estado OCUPADA con una comanda activa.
   */
  static abrirAdHoc(
    datos: {
      id: MesaId;
      nombre: NombreMesa;
      puntoDeVentaId: BusinessUnitIdRef;
      comandaId: ComandaId;
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Mesa {
    const props: MesaProps = {
      id: datos.id,
      nombre: datos.nombre,
      tipo: TipoDeMesa.AD_HOC,
      puntoDeVentaId: datos.puntoDeVentaId,
      estado: EstadoDeMesa.OCUPADA,
      comandaActivaId: datos.comandaId,
      creadaEn: datos.ahora,
    };
    const event: MesaOcupada = {
      type: 'MesaOcupada',
      aggregateId: datos.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      comandaId: datos.comandaId.toString(),
    };
    return new Mesa(props, [event]);
  }

  /** Reconstitución desde persistencia (sin eventos). */
  static reconstituir(props: MesaProps): Mesa {
    return new Mesa(props, []);
  }

  // ── Comandos ────────────────────────────────────────────────

  /** Ocupa la mesa asignándole una comanda activa. */
  ocupar(
    comandaId: ComandaId,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Mesa, TransicionDeMesaInvalidaError | MesaYaOcupadaError> {
    if (this.estado === EstadoDeMesa.OCUPADA) return err(new MesaYaOcupadaError());
    if (this.estado !== EstadoDeMesa.LIBRE && this.estado !== EstadoDeMesa.RESERVADA) {
      return err(new TransicionDeMesaInvalidaError(this.estado, EstadoDeMesa.OCUPADA));
    }
    const event: MesaOcupada = {
      type: 'MesaOcupada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      comandaId: comandaId.toString(),
    };
    return ok(this.with({ estado: EstadoDeMesa.OCUPADA, comandaActivaId: comandaId }, event));
  }

  /** Reserva la mesa (solo desde LIBRE). */
  reservar(
    _reservadaPor: UsuarioIdRef,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Mesa, TransicionDeMesaInvalidaError> {
    if (this.estado !== EstadoDeMesa.LIBRE) {
      return err(new TransicionDeMesaInvalidaError(this.estado, EstadoDeMesa.RESERVADA));
    }
    const event: MesaConfigurada = {
      type: 'MesaConfigurada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      nombre: this.nombre.toString(),
      puntoDeVentaId: this.puntoDeVentaId.toString(),
    };
    return ok(this.with({ estado: EstadoDeMesa.RESERVADA }, event));
  }

  /** Inicia el proceso de cobro (OCUPADA → EN_COBRO). */
  iniciarCobro(
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Mesa, TransicionDeMesaInvalidaError> {
    if (this.estado !== EstadoDeMesa.OCUPADA) {
      return err(new TransicionDeMesaInvalidaError(this.estado, EstadoDeMesa.EN_COBRO));
    }
    const event: MesaEnCobro = {
      type: 'MesaEnCobro',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
    };
    return ok(this.with({ estado: EstadoDeMesa.EN_COBRO }, event));
  }

  /** Libera la mesa (OCUPADA o EN_COBRO → LIBRE). */
  liberar(ahora: FechaHora, correlacionId: string): Result<Mesa, TransicionDeMesaInvalidaError> {
    if (
      this.estado !== EstadoDeMesa.OCUPADA &&
      this.estado !== EstadoDeMesa.EN_COBRO &&
      this.estado !== EstadoDeMesa.RESERVADA
    ) {
      return err(new TransicionDeMesaInvalidaError(this.estado, EstadoDeMesa.LIBRE));
    }
    const event: MesaLiberada = {
      type: 'MesaLiberada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
    };
    return ok(this.with({ estado: EstadoDeMesa.LIBRE, comandaActivaId: null }, event));
  }

  /** Cancela el cobro volviendo a OCUPADA (EN_COBRO → OCUPADA). */
  cancelarCobro(
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Mesa, TransicionDeMesaInvalidaError> {
    if (this.estado !== EstadoDeMesa.EN_COBRO) {
      return err(new TransicionDeMesaInvalidaError(this.estado, EstadoDeMesa.OCUPADA));
    }
    const event: MesaOcupada = {
      type: 'MesaOcupada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      comandaId: this.comandaActivaId?.toString() ?? '',
    };
    return ok(this.with({ estado: EstadoDeMesa.OCUPADA }, event));
  }
}
