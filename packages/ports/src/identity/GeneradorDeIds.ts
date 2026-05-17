import type { UsuarioId, SesionId, DispositivoId } from '@zahavi/domain-identity';

/** Puerto para generación de identidades únicas. Implementado con `crypto.randomUUID()`. */
export interface GeneradorDeIds {
  generarUsuarioId(): UsuarioId;
  generarSesionId(): SesionId;
  generarDispositivoId(): DispositivoId;
  /** Retorna un UUID v4 para domain events (sin branded type). */
  generarEventoId(): string;
}
