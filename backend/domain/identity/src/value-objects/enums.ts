export type Rol = 'SUPERADMIN' | 'ADMIN' | 'WORKER';
export const ROL_VALORES: readonly Rol[] = ['SUPERADMIN', 'ADMIN', 'WORKER'];

export type EstadoDeUsuario = 'activo' | 'deshabilitado';
export type EstadoDeSesion = 'activa' | 'expirada' | 'revocada' | 'cerrada';
export type EstadoDeBloqueo = 'desbloqueada' | 'bloqueada';
export type EstadoDeDispositivo = 'activo' | 'revocado';
export type ContextoDeDispositivo = 'compartido' | 'personal';

export type MotivoDeRevocacionDeSesion =
  | 'cierre_voluntario'
  | 'inactividad'
  | 'tope_absoluto'
  | 'nuevo_login_misma_cuenta'
  | 'revocada_por_admin'
  | 'dispositivo_revocado'
  | 'usuario_deshabilitado';
