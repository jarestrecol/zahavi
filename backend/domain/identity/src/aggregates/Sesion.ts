import { type Result, ok, err } from '../errors/DomainError.js';
import {
  SesionYaCerradaError,
  SesionBloqueadaError,
  SesionExpiradaError,
  RelojRetrocedidoError,
} from '../errors/index.js';
import { SesionId, DispositivoId, UsuarioId, MesaId } from '../value-objects/ids.js';
import {
  type Rol,
  type EstadoDeSesion,
  type EstadoDeBloqueo,
  type MotivoDeRevocacionDeSesion,
  type ContextoDeDispositivo,
} from '../value-objects/enums.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import { PoliticaDeSesion } from '../value-objects/PoliticaDeSesion.js';
import {
  type SesionAbiertaEvent,
  type PantallaBloqueadaEvent,
  type PantallaDesbloqueadaEvent,
  type SesionCerradaEvent,
  type SesionExpiradaPorInactividadEvent,
  type SesionExpiradaPorTopeAbsolutoEvent,
  type SesionRevocadaEvent,
  type SesionCerradaConMesaAbiertaEvent,
  type IdentityDomainEvent,
} from '../events/index.js';

export interface SesionProps {
  readonly id: SesionId;
  readonly usuarioId: UsuarioId;
  readonly rol: Rol;
  readonly dispositivoId: DispositivoId | null;
  readonly politica: PoliticaDeSesion;
  readonly contextoDispositivo: ContextoDeDispositivo;
  readonly iniciadaEn: FechaHora;
  readonly ultimaActividadEn: FechaHora;
  readonly expiraEnAbsoluto: FechaHora;
  readonly estadoSesion: EstadoDeSesion;
  readonly estadoBloqueo: EstadoDeBloqueo;
  readonly bloqueadaEn: FechaHora | null;
  readonly cerradaEn: FechaHora | null;
  readonly motivoDeCierre: MotivoDeRevocacionDeSesion | null;
}

export class Sesion {
  readonly id: SesionId;
  readonly usuarioId: UsuarioId;
  readonly rol: Rol;
  readonly dispositivoId: DispositivoId | null;
  readonly politica: PoliticaDeSesion;
  readonly contextoDispositivo: ContextoDeDispositivo;
  readonly iniciadaEn: FechaHora;
  readonly ultimaActividadEn: FechaHora;
  readonly expiraEnAbsoluto: FechaHora;
  readonly estadoSesion: EstadoDeSesion;
  readonly estadoBloqueo: EstadoDeBloqueo;
  readonly bloqueadaEn: FechaHora | null;
  readonly cerradaEn: FechaHora | null;
  readonly motivoDeCierre: MotivoDeRevocacionDeSesion | null;

  private readonly _events: IdentityDomainEvent[] = [];

  private constructor(props: SesionProps) {
    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.rol = props.rol;
    this.dispositivoId = props.dispositivoId;
    this.politica = props.politica;
    this.contextoDispositivo = props.contextoDispositivo;
    this.iniciadaEn = props.iniciadaEn;
    this.ultimaActividadEn = props.ultimaActividadEn;
    this.expiraEnAbsoluto = props.expiraEnAbsoluto;
    this.estadoSesion = props.estadoSesion;
    this.estadoBloqueo = props.estadoBloqueo;
    this.bloqueadaEn = props.bloqueadaEn;
    this.cerradaEn = props.cerradaEn;
    this.motivoDeCierre = props.motivoDeCierre;
  }

  static abrir(
    props: {
      id: SesionId;
      usuarioId: UsuarioId;
      rol: Rol;
      dispositivoId: DispositivoId | null;
      politica: PoliticaDeSesion;
      contextoDispositivo: ContextoDeDispositivo;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Sesion {
    const expiraEnAbsoluto = props.ahora.masMillisegundos(props.politica.topeAbsoluto.toMs());

    const sesion = new Sesion({
      id: props.id,
      usuarioId: props.usuarioId,
      rol: props.rol,
      dispositivoId: props.dispositivoId,
      politica: props.politica,
      contextoDispositivo: props.contextoDispositivo,
      iniciadaEn: props.ahora,
      ultimaActividadEn: props.ahora,
      expiraEnAbsoluto,
      estadoSesion: 'activa',
      estadoBloqueo: 'desbloqueada',
      bloqueadaEn: null,
      cerradaEn: null,
      motivoDeCierre: null,
    });

    const evento: SesionAbiertaEvent = {
      eventoId,
      tipo: 'SesionAbierta',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        sesionId: props.id.toString(),
        usuarioId: props.usuarioId.toString(),
        rol: props.rol,
        dispositivoId: props.dispositivoId?.toString() ?? null,
        expiraEnAbsolutoMs: expiraEnAbsoluto.toTimestamp(),
        umbralCierreMs: props.politica.umbralCierre.toMs(),
      },
    };
    sesion._events.push(evento);
    return sesion;
  }

  registrarActividad(
    ahora: FechaHora,
    eventoId: string,
  ): Result<
    Sesion,
    SesionYaCerradaError | SesionBloqueadaError | RelojRetrocedidoError | SesionExpiradaError
  > {
    const validado = this._validarActiva(ahora);
    if (!validado.ok) return validado;

    if (this.estadoBloqueo === 'bloqueada') return err(new SesionBloqueadaError());

    const expirada = this._expirarSiCorresponde(ahora, eventoId);
    if (!expirada.ok) return expirada;
    if (expirada.value !== null) return ok(expirada.value);

    const nuevo = new Sesion({ ...this._props(), ultimaActividadEn: ahora });
    nuevo._events.push(...this._events);
    return ok(nuevo);
  }

  bloquearPantalla(
    ahora: FechaHora,
    eventoId: string,
  ): Result<Sesion, SesionYaCerradaError | SesionExpiradaError | RelojRetrocedidoError> {
    const validado = this._validarActiva(ahora);
    if (!validado.ok) return validado;

    if (this.estadoBloqueo === 'bloqueada') return ok(this);

    const nuevo = new Sesion({
      ...this._props(),
      estadoBloqueo: 'bloqueada',
      bloqueadaEn: ahora,
    });
    const evento: PantallaBloqueadaEvent = {
      eventoId,
      tipo: 'PantallaBloqueada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { sesionId: this.id.toString(), usuarioId: this.usuarioId.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  desbloquear(
    ahora: FechaHora,
    eventoId: string,
  ): Result<Sesion, SesionYaCerradaError | SesionExpiradaError | RelojRetrocedidoError> {
    const validado = this._validarActiva(ahora);
    if (!validado.ok) return validado;

    if (this.estadoBloqueo === 'desbloqueada') return ok(this);

    const nuevo = new Sesion({
      ...this._props(),
      estadoBloqueo: 'desbloqueada',
      bloqueadaEn: null,
      ultimaActividadEn: ahora,
    });
    const evento: PantallaDesbloqueadaEvent = {
      eventoId,
      tipo: 'PantallaDesbloqueada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { sesionId: this.id.toString(), usuarioId: this.usuarioId.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cerrarVoluntariamente(ahora: FechaHora, eventoId: string): Result<Sesion, SesionYaCerradaError> {
    if (this.estadoSesion !== 'activa') return err(new SesionYaCerradaError(this.id.toString()));

    const nuevo = new Sesion({
      ...this._props(),
      estadoSesion: 'cerrada',
      cerradaEn: ahora,
      motivoDeCierre: 'cierre_voluntario',
    });
    const evento: SesionCerradaEvent = {
      eventoId,
      tipo: 'SesionCerrada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { sesionId: this.id.toString(), usuarioId: this.usuarioId.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  revocar(
    motivo: MotivoDeRevocacionDeSesion,
    ahora: FechaHora,
    eventoId: string,
    revocadaPor: UsuarioId | null,
  ): Sesion {
    // Idempotente: si ya está cerrada no hace nada
    if (this.estadoSesion !== 'activa') return this;

    const nuevo = new Sesion({
      ...this._props(),
      estadoSesion: 'revocada',
      cerradaEn: ahora,
      motivoDeCierre: motivo,
    });
    const evento: SesionRevocadaEvent = {
      eventoId,
      tipo: 'SesionRevocada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        sesionId: this.id.toString(),
        usuarioId: this.usuarioId.toString(),
        motivo,
        revocadaPor: revocadaPor?.toString() ?? null,
      },
    };
    nuevo._events.push(...this._events, evento);
    return nuevo;
  }

  /**
   * Cierra la sesión dejando registro de las mesas abiertas para que Sales
   * las marque como PENDIENTE_DE_REASIGNACION. Un cierre de sesión nunca
   * destruye datos del negocio.
   */
  cerrarConMesasAbiertas(
    mesasAbiertas: MesaId[],
    unidadId: string,
    ahora: FechaHora,
    eventoId: string,
  ): Sesion {
    if (this.estadoSesion !== 'activa') return this;

    const nuevo = new Sesion({
      ...this._props(),
      estadoSesion: 'expirada',
      cerradaEn: ahora,
      motivoDeCierre: 'inactividad',
    });
    const evento: SesionCerradaConMesaAbiertaEvent = {
      eventoId,
      tipo: 'SesionCerradaConMesaAbierta',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        sesionId: this.id.toString(),
        usuarioId: this.usuarioId.toString(),
        unidadId,
        mesasAbiertas: mesasAbiertas.map((m) => m.toString()),
      },
    };
    nuevo._events.push(...this._events, evento);
    return nuevo;
  }

  /** Evalúa si debe expirar. Retorna null si no corresponde. */
  expirarSiCorresponde(ahora: FechaHora, eventoId: string): Sesion | null {
    const r = this._expirarSiCorresponde(ahora, eventoId);
    return r.ok ? r.value : null;
  }

  /** Indica si el umbral de bloqueo automático se ha superado. */
  debeBloquearseAutomaticamente(ahora: FechaHora): boolean {
    if (this.estadoSesion !== 'activa') return false;
    if (this.estadoBloqueo === 'bloqueada') return false;
    if (this.contextoDispositivo !== 'compartido') return false;
    const inactividad = ahora.diferenciaEnMs(this.ultimaActividadEn);
    return inactividad >= this.politica.umbralBloqueo.toMs();
  }

  /** Devuelve una copia del buffer de Domain Events acumulados en esta instancia inmutable. */
  pullDomainEvents(): IdentityDomainEvent[] {
    return [...this._events];
  }

  static reconstituir(props: SesionProps): Sesion {
    return new Sesion(props);
  }

  // ── Helpers privados ────────────────────────────────────────

  private _validarActiva(
    ahora: FechaHora,
  ): Result<void, SesionYaCerradaError | SesionExpiradaError | RelojRetrocedidoError> {
    if (this.estadoSesion !== 'activa') return err(new SesionYaCerradaError(this.id.toString()));
    if (ahora.isBefore(this.ultimaActividadEn)) return err(new RelojRetrocedidoError());
    return ok(undefined);
  }

  private _expirarSiCorresponde(
    ahora: FechaHora,
    eventoId: string,
  ): Result<Sesion | null, SesionExpiradaError> {
    // Tope absoluto
    if (!ahora.isBefore(this.expiraEnAbsoluto)) {
      const nuevo = new Sesion({
        ...this._props(),
        estadoSesion: 'expirada',
        cerradaEn: ahora,
        motivoDeCierre: 'tope_absoluto',
      });
      const evento: SesionExpiradaPorTopeAbsolutoEvent = {
        eventoId,
        tipo: 'SesionExpiradaPorTopeAbsoluto',
        aggregateId: this.id.toString(),
        ocurridoEn: ahora.toTimestamp(),
        version: 1,
        payload: {
          sesionId: this.id.toString(),
          usuarioId: this.usuarioId.toString(),
          iniciadaEnMs: this.iniciadaEn.toTimestamp(),
        },
      };
      nuevo._events.push(...this._events, evento);
      return ok(nuevo);
    }
    // Umbral de cierre por inactividad
    const inactividad = ahora.diferenciaEnMs(this.ultimaActividadEn);
    if (inactividad >= this.politica.umbralCierre.toMs()) {
      const nuevo = new Sesion({
        ...this._props(),
        estadoSesion: 'expirada',
        cerradaEn: ahora,
        motivoDeCierre: 'inactividad',
      });
      const evento: SesionExpiradaPorInactividadEvent = {
        eventoId,
        tipo: 'SesionExpiradaPorInactividad',
        aggregateId: this.id.toString(),
        ocurridoEn: ahora.toTimestamp(),
        version: 1,
        payload: {
          sesionId: this.id.toString(),
          usuarioId: this.usuarioId.toString(),
          ultimaActividadEnMs: this.ultimaActividadEn.toTimestamp(),
        },
      };
      nuevo._events.push(...this._events, evento);
      return ok(nuevo);
    }
    return ok(null);
  }

  private _props(): SesionProps {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      rol: this.rol,
      dispositivoId: this.dispositivoId,
      politica: this.politica,
      contextoDispositivo: this.contextoDispositivo,
      iniciadaEn: this.iniciadaEn,
      ultimaActividadEn: this.ultimaActividadEn,
      expiraEnAbsoluto: this.expiraEnAbsoluto,
      estadoSesion: this.estadoSesion,
      estadoBloqueo: this.estadoBloqueo,
      bloqueadaEn: this.bloqueadaEn,
      cerradaEn: this.cerradaEn,
      motivoDeCierre: this.motivoDeCierre,
    };
  }
}
