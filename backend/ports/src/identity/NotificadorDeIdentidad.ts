import type {
  UsuarioId,
  SesionId,
  FechaHora,
  MotivoDeRevocacionDeSesion,
} from '@zahavi/domain-identity';

/**
 * Puerto de salida para notificaciones operativas del bounded context Identity.
 *
 * La implementación concreta puede enviar emails, notificaciones push o alertas
 * en Supabase Realtime, sin que el dominio dependa de ningún canal específico.
 */
export interface NotificadorDeIdentidad {
  /**
   * Alerta al último SUPERADMIN del sistema cuando está a punto de quedar sin
   * respaldo (p. ej., antes de degradar o deshabilitar a otro SUPERADMIN).
   * @param usuarioId - ID del SUPERADMIN afectado por la operación.
   * @param ahora - Momento en que ocurre el evento.
   */
  alertarUltimoSuperadmin(usuarioId: UsuarioId, ahora: FechaHora): Promise<void>;

  /**
   * Notifica al usuario que una de sus sesiones fue revocada por acción de un actor.
   * @param sesionId - ID de la sesión revocada.
   * @param usuarioId - ID del usuario dueño de la sesión.
   * @param motivo - Razón de la revocación para incluir en la notificación.
   */
  notificarSesionRevocada(
    sesionId: SesionId,
    usuarioId: UsuarioId,
    motivo: MotivoDeRevocacionDeSesion,
  ): Promise<void>;
}
