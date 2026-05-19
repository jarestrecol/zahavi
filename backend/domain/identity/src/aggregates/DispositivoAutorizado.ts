import { type Result, ok, err } from '../errors/DomainError.js';
import {
  NombreDeDispositivoVacioError,
  DispositivoYaActivoError,
  DispositivoNoActivoError,
} from '../errors/index.js';
import { DispositivoId, UsuarioId } from '../value-objects/ids.js';
import { type EstadoDeDispositivo } from '../value-objects/enums.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import {
  type DispositivoAutorizadoCreadoEvent,
  type DispositivoRevocadoEvent,
  type DispositivoReautorizadoEvent,
  type DispositivoRenombradoEvent,
  type IdentityDomainEvent,
} from '../events/index.js';

export interface CambioDeEstadoDispositivo {
  readonly estado: EstadoDeDispositivo;
  readonly cambiadoEn: FechaHora;
  readonly cambiadoPor: UsuarioId;
  readonly motivo: string;
}

export interface DispositivoAutorizadoProps {
  readonly id: DispositivoId;
  readonly nombre: string;
  readonly historialDeEstados: readonly CambioDeEstadoDispositivo[];
}

export class DispositivoAutorizado {
  readonly id: DispositivoId;
  readonly nombre: string;
  readonly historialDeEstados: readonly CambioDeEstadoDispositivo[];

  private readonly _events: IdentityDomainEvent[] = [];

  private constructor(props: DispositivoAutorizadoProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.historialDeEstados = props.historialDeEstados;
  }

  get estado(): EstadoDeDispositivo {
    const ultimo = this.historialDeEstados.at(-1);
    if (!ultimo) throw new Error('DispositivoAutorizado sin historial: estado inconsistente');
    return ultimo.estado;
  }

  static autorizar(
    props: {
      id: DispositivoId;
      nombre: string;
      autorizadoPor: UsuarioId;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<DispositivoAutorizado, NombreDeDispositivoVacioError> {
    if (!props.nombre.trim()) return err(new NombreDeDispositivoVacioError());

    const entradaInicial: CambioDeEstadoDispositivo = {
      estado: 'activo',
      cambiadoEn: props.ahora,
      cambiadoPor: props.autorizadoPor,
      motivo: 'autorización inicial',
    };

    const dispositivo = new DispositivoAutorizado({
      id: props.id,
      nombre: props.nombre.trim(),
      historialDeEstados: [entradaInicial],
    });

    const evento: DispositivoAutorizadoCreadoEvent = {
      eventoId,
      tipo: 'DispositivoAutorizadoCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        dispositivoId: props.id.toString(),
        nombre: props.nombre.trim(),
        autorizadoPor: props.autorizadoPor.toString(),
      },
    };
    dispositivo._events.push(evento);
    return ok(dispositivo);
  }

  revocar(
    props: {
      revocadoPor: UsuarioId;
      motivo: string;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<DispositivoAutorizado, DispositivoNoActivoError> {
    // Invariante 2: idempotente si ya está revocado
    if (this.estado === 'revocado') return ok(this);

    const nuevaEntrada: CambioDeEstadoDispositivo = {
      estado: 'revocado',
      cambiadoEn: props.ahora,
      cambiadoPor: props.revocadoPor,
      motivo: props.motivo,
    };

    const nuevo = new DispositivoAutorizado({
      ...this._props(),
      historialDeEstados: [...this.historialDeEstados, nuevaEntrada],
    });

    const evento: DispositivoRevocadoEvent = {
      eventoId,
      tipo: 'DispositivoRevocado',
      aggregateId: this.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        dispositivoId: this.id.toString(),
        revocadoPor: props.revocadoPor.toString(),
        motivo: props.motivo,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  reautorizar(
    props: {
      reautorizadoPor: UsuarioId;
      motivo: string;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<DispositivoAutorizado, DispositivoYaActivoError> {
    if (this.estado === 'activo') return err(new DispositivoYaActivoError(this.id.toString()));

    const nuevaEntrada: CambioDeEstadoDispositivo = {
      estado: 'activo',
      cambiadoEn: props.ahora,
      cambiadoPor: props.reautorizadoPor,
      motivo: props.motivo,
    };

    const nuevo = new DispositivoAutorizado({
      ...this._props(),
      historialDeEstados: [...this.historialDeEstados, nuevaEntrada],
    });

    const evento: DispositivoReautorizadoEvent = {
      eventoId,
      tipo: 'DispositivoReautorizado',
      aggregateId: this.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        dispositivoId: this.id.toString(),
        reautorizadoPor: props.reautorizadoPor.toString(),
        motivo: props.motivo,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  renombrar(
    nuevoNombre: string,
    ahora: FechaHora,
    eventoId: string,
  ): Result<DispositivoAutorizado, NombreDeDispositivoVacioError> {
    if (!nuevoNombre.trim()) return err(new NombreDeDispositivoVacioError());

    const nombreAnterior = this.nombre;
    const nuevo = new DispositivoAutorizado({
      ...this._props(),
      nombre: nuevoNombre.trim(),
    });

    const evento: DispositivoRenombradoEvent = {
      eventoId,
      tipo: 'DispositivoRenombrado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        dispositivoId: this.id.toString(),
        nombreAnterior,
        nombreNuevo: nuevoNombre.trim(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  pullDomainEvents(): IdentityDomainEvent[] {
    return [...this._events];
  }

  static reconstituir(props: DispositivoAutorizadoProps): DispositivoAutorizado {
    return new DispositivoAutorizado(props);
  }

  private _props(): DispositivoAutorizadoProps {
    return { id: this.id, nombre: this.nombre, historialDeEstados: this.historialDeEstados };
  }
}
