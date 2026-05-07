import type { UsuarioId, SesionId, DispositivoId } from '@zahavi/domain-identity';

export interface GeneradorDeIds {
  generarUsuarioId(): UsuarioId;
  generarSesionId(): SesionId;
  generarDispositivoId(): DispositivoId;
  generarEventoId(): string;
}
