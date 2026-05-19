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

/** Credencial de acceso para ADMIN y SUPERADMIN, que usan navegador con contraseña (+ TOTP opcional/obligatorio). */
export interface CredencialDeNavegador {
  readonly tipo: 'navegador';
  readonly hashDeContrasena: HashDeContrasena;
  /** Secreto TOTP enrolado; `null` si el enrolamiento no ha iniciado. */
  readonly secretoTotp: SecretoTotp | null;
  /** `true` solo cuando el usuario confirmó el código TOTP post-enrolamiento. */
  readonly totpVerificado: boolean;
}

/** Credencial de acceso para WORKER, que usa tablet con PIN numérico. */
export interface CredencialDeTablet {
  readonly tipo: 'tablet';
  readonly hashDePin: HashDePin;
}

/** Unión discriminada de credenciales; el `tipo` determina el rol implícito. */
export type Credencial = CredencialDeNavegador | CredencialDeTablet;

function credencialCoherenteConRol(rol: Rol, credencial: Credencial): boolean {
  if (rol === 'WORKER') return credencial.tipo === 'tablet';
  return credencial.tipo === 'navegador';
}

// ──────────────────────────────────────────────────────────────
// Aggregate
// ──────────────────────────────────────────────────────────────

/** Props de reconstitución del aggregate `Usuario`. */
export interface UsuarioProps {
  readonly id: UsuarioId;
  readonly email: Email;
  readonly nombre: NombreCompleto;
  readonly rol: Rol;
  readonly estado: 'activo' | 'deshabilitado';
  readonly credencial: Credencial;
  readonly creadoEn: FechaHora;
  /** `null` solo para el primer SUPERADMIN creado en bootstrap. */
  readonly creadoPor: UsuarioId | null;
}

/**
 * Aggregate raíz del bounded context Identity.
 *
 * Invariantes clave:
 * 1. El email es único por sistema (validado en la capa de persistencia).
 * 2. El tipo de credencial debe ser coherente con el rol (`tablet` ↔ `WORKER`, `navegador` ↔ `ADMIN`/`SUPERADMIN`).
 * 3. Un WORKER no puede tener TOTP.
 * 4. SUPERADMIN debe tener TOTP enrolado y verificado para estar operativo.
 * 5. No se puede deshabilitar al último SUPERADMIN del sistema.
 * 6. Solo un SUPERADMIN puede crear o promover a otro SUPERADMIN.
 * 7. Un actor no puede deshabilitarse a sí mismo.
 *
 * Todos los comandos devuelven nuevas instancias (inmutabilidad) y registran Domain Events.
 */
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

  /**
   * Crea un nuevo usuario y emite `UsuarioCreado`.
   * @param props.actorRol - Rol del creador; `null` solo en el bootstrap del primer SUPERADMIN.
   * @param eventoId - UUID único para el evento de dominio emitido.
   * @returns `err(CredencialIncoherenteConRolError)` si credencial y rol no coinciden.
   * @returns `err(RolNoAutorizadoParaCrearError)` si un no-SUPERADMIN intenta crear SUPERADMIN.
   */
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

  /**
   * Cambia el rol del usuario y su credencial asociada. Emite `RolDeUsuarioCambiado`.
   * @param estaEsElUltimoSuperadmin - Debe calcularse en la capa de aplicación antes de llamar.
   * @returns `err(UltimoSuperadminProtegidoError)` si degradaría al único SUPERADMIN del sistema.
   */
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

  /**
   * Deshabilita al usuario. Emite `UsuarioDeshabilitado`.
   * @returns `err(AccionSobreSiMismoNoPermitidaError)` si `actorId` es el mismo usuario.
   * @returns `err(UltimoSuperadminProtegidoError)` si es el único SUPERADMIN del sistema.
   */
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

  /**
   * Reactiva un usuario deshabilitado. Emite `UsuarioRehabilitado`.
   * @returns `err(UsuarioNoActivoError)` si el usuario ya está activo.
   */
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

  /**
   * Actualiza el hash de contraseña para usuarios con credencial tipo `navegador`. Emite `ContrasenaDeUsuarioCambiada`.
   * @returns `err(CredencialIncoherenteConRolError)` si el usuario es WORKER (usa PIN, no contraseña).
   */
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

  /**
   * Actualiza el hash de PIN para usuarios WORKER con credencial tipo `tablet`. Emite `PinDeUsuarioCambiado`.
   * @returns `err(CredencialIncoherenteConRolError)` si el usuario es ADMIN/SUPERADMIN (usa contraseña, no PIN).
   */
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

  /**
   * Registra un nuevo secreto TOTP e inicia el proceso de enrolamiento (pone `totpVerificado = false`).
   * Emite `SecretoTotpRegenerado`. El usuario queda no-operativo hasta llamar `confirmarTotp`.
   * @returns `err(CredencialIncoherenteConRolError)` si el usuario es WORKER.
   */
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

  /**
   * Confirma el enrolamiento TOTP (pone `totpVerificado = true`). Emite `TotpDeUsuarioVerificado`.
   * Debe llamarse tras verificar el código TOTP generado desde el secreto de enrolamiento.
   * @returns `err(CredencialIncoherenteConRolError)` si el usuario es WORKER.
   */
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

  /**
   * Indica si el usuario puede autenticarse en este momento.
   *
   * Retorna `false` si:
   * - El estado es `deshabilitado`.
   * - El TOTP está enrolado pero no confirmado (enrolamiento incompleto).
   * - El rol es SUPERADMIN y no tiene TOTP enrolado.
   */
  estaOperativo(): boolean {
    if (this.estado !== 'activo') return false;
    if (this.credencial.tipo === 'navegador') {
      // TOTP enrolado pero no confirmado bloquea a cualquier rol (enrolamiento incompleto)
      if (this.credencial.secretoTotp !== null && !this.credencial.totpVerificado) return false;
      // SUPERADMIN siempre requiere TOTP enrolado y verificado
      if (this.rol === 'SUPERADMIN' && this.credencial.secretoTotp === null) return false;
    }
    return true;
  }

  /** Devuelve una copia del buffer de Domain Events acumulados en esta instancia inmutable. */
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
