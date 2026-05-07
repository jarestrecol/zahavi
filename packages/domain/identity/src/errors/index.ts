export { DomainError, ok, err } from './DomainError.js';
export type { Result } from './DomainError.js';

import { DomainError } from './DomainError.js';

export class EmailInvalidoError extends DomainError {
  readonly code = 'IDENTITY_EMAIL_INVALIDO';
  constructor(raw: string) {
    super(`Email inválido: "${raw}"`);
  }
}

export class NombreCompletoInvalidoError extends DomainError {
  readonly code = 'IDENTITY_NOMBRE_INVALIDO';
  constructor(raw: string) {
    super(`Nombre completo inválido: "${raw}"`);
  }
}

export class PinInvalidoError extends DomainError {
  readonly code = 'IDENTITY_PIN_INVALIDO';
  constructor() {
    super('El PIN debe tener exactamente 6 dígitos numéricos.');
  }
}

export class ContrasenaDebilError extends DomainError {
  readonly code = 'IDENTITY_CONTRASENA_DEBIL';
  constructor(razon: string) {
    super(`Contraseña no cumple la política: ${razon}`);
  }
}

export class CredencialIncoherenteConRolError extends DomainError {
  readonly code = 'IDENTITY_CREDENCIAL_INCOHERENTE';
  constructor(rol: string, tipoCredencial: string) {
    super(`El tipo de credencial "${tipoCredencial}" no corresponde al rol "${rol}".`);
  }
}

export class RolNoAutorizadoParaCrearError extends DomainError {
  readonly code = 'IDENTITY_ROL_NO_AUTORIZADO_CREAR';
  constructor(rolActor: string, rolObjetivo: string) {
    super(`El rol "${rolActor}" no puede crear usuarios con rol "${rolObjetivo}".`);
  }
}

export class UltimoSuperadminProtegidoError extends DomainError {
  readonly code = 'IDENTITY_ULTIMO_SUPERADMIN_PROTEGIDO';
  constructor() {
    super('No se puede deshabilitar, eliminar ni degradar al único SUPERADMIN activo.');
  }
}

export class UsuarioNoActivoError extends DomainError {
  readonly code = 'IDENTITY_USUARIO_NO_ACTIVO';
  constructor(usuarioId: string) {
    super(`El usuario "${usuarioId}" está deshabilitado.`);
  }
}

export class TotpNoVerificadoError extends DomainError {
  readonly code = 'IDENTITY_TOTP_NO_VERIFICADO';
  constructor() {
    super('El factor TOTP no ha sido verificado. Debe completar el enrolamiento.');
  }
}

export class DispositivoRequeridoParaWorkerError extends DomainError {
  readonly code = 'IDENTITY_DISPOSITIVO_REQUERIDO';
  constructor() {
    super('Los usuarios con rol WORKER deben autenticarse desde un dispositivo autorizado.');
  }
}

export class SesionYaCerradaError extends DomainError {
  readonly code = 'IDENTITY_SESION_YA_CERRADA';
  constructor(sesionId: string) {
    super(`La sesión "${sesionId}" ya fue cerrada, expirada o revocada.`);
  }
}

export class SesionBloqueadaError extends DomainError {
  readonly code = 'IDENTITY_SESION_BLOQUEADA';
  constructor() {
    super('La sesión está bloqueada. Desbloquee antes de registrar actividad.');
  }
}

export class SesionExpiradaError extends DomainError {
  readonly code = 'IDENTITY_SESION_EXPIRADA';
  constructor(sesionId: string) {
    super(`La sesión "${sesionId}" ha expirado.`);
  }
}

export class LimiteDeSesionesAlcanzadoError extends DomainError {
  readonly code = 'IDENTITY_LIMITE_SESIONES';
  constructor(limite: number) {
    super(
      `Se alcanzó el límite de ${limite} sesiones simultáneas. Revoque una desde el panel de dispositivos.`,
    );
  }
}

export class DispositivoNoAutorizadoError extends DomainError {
  readonly code = 'IDENTITY_DISPOSITIVO_NO_AUTORIZADO';
  constructor(dispositivoId: string) {
    super(`El dispositivo "${dispositivoId}" no está autorizado o fue revocado.`);
  }
}

export class RelojRetrocedidoError extends DomainError {
  readonly code = 'IDENTITY_RELOJ_RETROCEDIDO';
  constructor() {
    super('El instante recibido es anterior a la última actividad registrada.');
  }
}

export class NombreDeDispositivoVacioError extends DomainError {
  readonly code = 'IDENTITY_NOMBRE_DISPOSITIVO_VACIO';
  constructor() {
    super('El nombre del dispositivo no puede estar vacío.');
  }
}

export class DispositivoYaActivoError extends DomainError {
  readonly code = 'IDENTITY_DISPOSITIVO_YA_ACTIVO';
  constructor(dispositivoId: string) {
    super(`El dispositivo "${dispositivoId}" ya está activo.`);
  }
}

export class DispositivoNoActivoError extends DomainError {
  readonly code = 'IDENTITY_DISPOSITIVO_NO_ACTIVO';
  constructor(dispositivoId: string) {
    super(`El dispositivo "${dispositivoId}" no está activo.`);
  }
}

export class AccionSobreSiMismoNoPermitidaError extends DomainError {
  readonly code = 'IDENTITY_ACCION_SOBRE_SI_MISMO';
  constructor(accion: string) {
    super(`No se puede ejecutar "${accion}" sobre el propio usuario.`);
  }
}

export class UsuarioNoEncontradoError extends DomainError {
  readonly code = 'IDENTITY_USUARIO_NO_ENCONTRADO';
  constructor(ref: string) {
    super(`Usuario no encontrado: "${ref}"`);
  }
}

export class SesionNoEncontradaError extends DomainError {
  readonly code = 'IDENTITY_SESION_NO_ENCONTRADA';
  constructor(sesionId: string) {
    super(`Sesión no encontrada: "${sesionId}"`);
  }
}

export class CredencialesInvalidasError extends DomainError {
  readonly code = 'IDENTITY_CREDENCIALES_INVALIDAS';
  constructor() {
    super('Las credenciales proporcionadas son inválidas.');
  }
}

export class EmailYaRegistradoError extends DomainError {
  readonly code = 'IDENTITY_EMAIL_YA_REGISTRADO';
  constructor(email: string) {
    super(`El email "${email}" ya está registrado.`);
  }
}
