import type {
  UsuarioId,
  SesionId,
  FechaHora,
  MotivoDeRevocacionDeSesion,
} from '@zahavi/domain-identity';

export interface NotificadorDeIdentidad {
  alertarUltimoSuperadmin(usuarioId: UsuarioId, ahora: FechaHora): Promise<void>;
  notificarSesionRevocada(
    sesionId: SesionId,
    usuarioId: UsuarioId,
    motivo: MotivoDeRevocacionDeSesion,
  ): Promise<void>;
}
