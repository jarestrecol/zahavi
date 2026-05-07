import { type Result, ok, err } from '../errors/DomainError.js';
import {
  CredencialIncoherenteConRolError,
  RolNoAutorizadoParaCrearError,
  UltimoSuperadminProtegidoError,
  UsuarioNoActivoError,
  AccionSobreSiMismoNoPermitidaError,
} from '../errors/index.js';
import { UsuarioId } from '../value-objects/ids.js';
import { Email } from '../value-objects/Email.js';
import { NombreCompleto } from '../value-objects/NombreCompleto.js';
import { type Rol } from '../value-objects/enums.js';
import { HashDeContrasena, HashDePin, SecretoTotp } from '../value-objects/credenciales.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import {
  type UsuarioCreadoEvent,
  type RolDeUsuarioCambiadoEvent,
  type UsuarioDeshabilitadoEvent,
  type UsuarioRehabilitadoEvent,
  type ContrasenaDeUsuarioCambiadaEvent,
  type PinDeUsuarioCambiadoEvent,
  type TotpDeUsuarioVerificadoEvent,
  type SecretoTotpRegeneradoEvent,
  type IdentityDomainEvent,
} from '../events/index.js';

// ──────────────────────────────────────────────────────────────
// Credencial interna (entidad anidada, no VO — su estado evoluciona)
// ──────────────────────────────────────────────────────────────

export interface CredencialDeNavegador {
  readonly tipo: 'navegador';
  readonly hashDeContrasena: HashDeContrasena;
  readonly secretoTotp: SecretoTotp | null;
  readonly totpVerificado: boolean;
}

export interface CredencialDeTablet {
  readonly tipo: 'tablet';
  readonly hashDePin: HashDePin;
}

export type Credencial = CredencialDeNavegador | CredencialDeTablet;

function credencialCoherenteConRol(rol: Rol, credencial: Credencial): boolean {
  if (rol === 'WORKER') return credencial.tipo === 'tablet';
  return credencial.tipo === 'navegador';
}

// ──────────────────────────────────────────────────────────────
// Aggregate
// ──────────────────────────────────────────────────────────────

export interface UsuarioProps {
  readonly id: UsuarioId;
  readonly email: Email;
  readonly nombre: NombreCompleto;
  readonly rol: Rol;
  readonly estado: 'activo' | 'deshabilitado';
  readonly credencial: Credencial;
  readonly creadoEn: FechaHora;
  readonly creadoPor: UsuarioId | null;
}

export class Usuario {
  readonly id: UsuarioId;
  readonly email: Email;
  readonly nombre: NombreCompleto;
  readonly rol: Rol;
  readonly estado: 'activo' | 'deshabilitado';
  readonly credencial: Credencial;
  readonly creadoEn: FechaHora;
  readonly creadoPor: UsuarioId | null;

  private readonly _events: IdentityDomainEvent[] = [];

  private constructor(props: UsuarioProps) {
    this.id = props.id;
    this.email = props.email;
    this.nombre = props.nombre;
    this.rol = props.rol;
    this.estado = props.estado;
    this.credencial = props.credencial;
    this.creadoEn = props.creadoEn;
    this.creadoPor = props.creadoPor;
  }

  // ── Factoría ────────────────────────────────────────────────

  static crear(
    props: {
      id: UsuarioId;
      email: Email;
      nombre: NombreCompleto;
      rol: Rol;
      credencial: Credencial;
      ahora: FechaHora;
      creadoPor: UsuarioId | null;
      actorRol: Rol | null; // null solo para bootstrap del primer SUPERADMIN
    },
    eventoId: string,
  ): Result<Usuario, CredencialIncoherenteConRolError | RolNoAutorizadoParaCrearError> {
    // Invariante 2: tipo de credencial coherente con rol
    if (!credencialCoherenteConRol(props.rol, props.credencial)) {
      return err(new CredencialIncoherenteConRolError(props.rol, props.credencial.tipo));
    }

    // Invariante 6: solo SUPERADMIN puede crear otro SUPERADMIN
    if (props.rol === 'SUPERADMIN' && props.actorRol !== null && props.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoParaCrearError(props.actorRol, props.rol));
    }

    const usuario = new Usuario({
      id: props.id,
      email: props.email,
      nombre: props.nombre,
      rol: props.rol,
      estado: 'activo',
      credencial: props.credencial,
      creadoEn: props.ahora,
      creadoPor: props.creadoPor,
    });

    const evento: UsuarioCreadoEvent = {
      eventoId,
      tipo: 'UsuarioCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        usuarioId: props.id.toString(),
        email: props.email.toString(),
        nombre: props.nombre.toString(),
        rol: props.rol,
        creadoPor: props.creadoPor?.toString() ?? null,
      },
    };
    usuario._events.push(evento);
    return ok(usuario);
  }

  // ── Comandos ────────────────────────────────────────────────

  cambiarRol(
    nuevoRol: Rol,
    nuevaCredencial: Credencial,
    actorId: UsuarioId,
    actorRol: Rol,
    ahora: FechaHora,
    eventoId: string,
    estaEsElUltimoSuperadmin: boolean,
  ): Result<
    Usuario,
    | CredencialIncoherenteConRolError
    | RolNoAutorizadoParaCrearError
    | UltimoSuperadminProtegidoError
    | UsuarioNoActivoError
  > {
    if (this.estado === 'deshabilitado') return err(new UsuarioNoActivoError(this.id.toString()));

    if (!credencialCoherenteConRol(nuevoRol, nuevaCredencial))
      return err(new CredencialIncoherenteConRolError(nuevoRol, nuevaCredencial.tipo));

    if (nuevoRol === 'SUPERADMIN' && actorRol !== 'SUPERADMIN')
      return err(new RolNoAutorizadoParaCrearError(actorRol, nuevoRol));

    // Invariante 7: no degradar al último SUPERADMIN
    if (this.rol === 'SUPERADMIN' && nuevoRol !== 'SUPERADMIN' && estaEsElUltimoSuperadmin) {
      return err(new UltimoSuperadminProtegidoError());
    }

    const nuevo = new Usuario({ ...this._props(), rol: nuevoRol, credencial: nuevaCredencial });
    const evento: RolDeUsuarioCambiadoEvent = {
      eventoId,
      tipo: 'RolDeUsuarioCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        usuarioId: this.id.toString(),
        rolAnterior: this.rol,
        rolNuevo: nuevoRol,
        cambiadoPor: actorId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  deshabilitar(
    actorId: UsuarioId,
    motivo: string,
    ahora: FechaHora,
    eventoId: string,
    estaEsElUltimoSuperadmin: boolean,
  ): Result<
    Usuario,
    AccionSobreSiMismoNoPermitidaError | UltimoSuperadminProtegidoError | UsuarioNoActivoError
  > {
    if (this.estado === 'deshabilitado') return err(new UsuarioNoActivoError(this.id.toString()));

    if (actorId.equals(this.id)) return err(new AccionSobreSiMismoNoPermitidaError('deshabilitar'));

    if (this.rol === 'SUPERADMIN' && estaEsElUltimoSuperadmin)
      return err(new UltimoSuperadminProtegidoError());

    const nuevo = new Usuario({ ...this._props(), estado: 'deshabilitado' });
    const evento: UsuarioDeshabilitadoEvent = {
      eventoId,
      tipo: 'UsuarioDeshabilitado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        usuarioId: this.id.toString(),
        deshabilitadoPor: actorId.toString(),
        motivo,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  rehabilitar(
    actorId: UsuarioId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Usuario, UsuarioNoActivoError> {
    if (this.estado === 'activo') return err(new UsuarioNoActivoError(`${this.id} ya está activo`));

    const nuevo = new Usuario({ ...this._props(), estado: 'activo' });
    const evento: UsuarioRehabilitadoEvent = {
      eventoId,
      tipo: 'UsuarioRehabilitado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        usuarioId: this.id.toString(),
        rehabilitadoPor: actorId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarContrasena(
    nuevoHash: HashDeContrasena,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Usuario, CredencialIncoherenteConRolError | UsuarioNoActivoError> {
    if (this.estado === 'deshabilitado') return err(new UsuarioNoActivoError(this.id.toString()));
    if (this.credencial.tipo !== 'navegador')
      return err(new CredencialIncoherenteConRolError(this.rol, 'tablet'));

    const nuevaCredencial: CredencialDeNavegador = {
      ...this.credencial,
      hashDeContrasena: nuevoHash,
    };
    const nuevo = new Usuario({ ...this._props(), credencial: nuevaCredencial });
    const evento: ContrasenaDeUsuarioCambiadaEvent = {
      eventoId,
      tipo: 'ContrasenaDeUsuarioCambiada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { usuarioId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarPin(
    nuevoHash: HashDePin,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Usuario, CredencialIncoherenteConRolError | UsuarioNoActivoError> {
    if (this.estado === 'deshabilitado') return err(new UsuarioNoActivoError(this.id.toString()));
    if (this.credencial.tipo !== 'tablet')
      return err(new CredencialIncoherenteConRolError(this.rol, 'navegador'));

    const nuevaCredencial: CredencialDeTablet = { tipo: 'tablet', hashDePin: nuevoHash };
    const nuevo = new Usuario({ ...this._props(), credencial: nuevaCredencial });
    const evento: PinDeUsuarioCambiadoEvent = {
      eventoId,
      tipo: 'PinDeUsuarioCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { usuarioId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  registrarSecretoTotp(
    secreto: SecretoTotp,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Usuario, CredencialIncoherenteConRolError> {
    if (this.credencial.tipo !== 'navegador')
      return err(new CredencialIncoherenteConRolError(this.rol, 'tablet'));

    const nuevaCredencial: CredencialDeNavegador = {
      ...this.credencial,
      secretoTotp: secreto,
      totpVerificado: false,
    };
    const nuevo = new Usuario({ ...this._props(), credencial: nuevaCredencial });
    const evento: SecretoTotpRegeneradoEvent = {
      eventoId,
      tipo: 'SecretoTotpRegenerado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { usuarioId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  confirmarTotp(
    ahora: FechaHora,
    eventoId: string,
  ): Result<Usuario, CredencialIncoherenteConRolError> {
    if (this.credencial.tipo !== 'navegador')
      return err(new CredencialIncoherenteConRolError(this.rol, 'tablet'));

    const nuevaCredencial: CredencialDeNavegador = {
      ...this.credencial,
      totpVerificado: true,
    };
    const nuevo = new Usuario({ ...this._props(), credencial: nuevaCredencial });
    const evento: TotpDeUsuarioVerificadoEvent = {
      eventoId,
      tipo: 'TotpDeUsuarioVerificado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { usuarioId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas ───────────────────────────────────────────────

  estaOperativo(): boolean {
    if (this.estado !== 'activo') return false;
    if (this.credencial.tipo === 'navegador' && !this.credencial.totpVerificado) return false;
    return true;
  }

  pullDomainEvents(): IdentityDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers privados ────────────────────────────────────────

  private _props(): UsuarioProps {
    return {
      id: this.id,
      email: this.email,
      nombre: this.nombre,
      rol: this.rol,
      estado: this.estado,
      credencial: this.credencial,
      creadoEn: this.creadoEn,
      creadoPor: this.creadoPor,
    };
  }

  // Reconstrucción desde persistencia (sin emitir eventos)
  static reconstituir(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }
}
