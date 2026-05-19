import { randomUUID } from 'node:crypto';
import { UsuarioId, SesionId, DispositivoId } from '@zahavi/domain-identity';
import type { GeneradorDeIds } from '@zahavi/ports';

export class GeneradorDeIdsUuid implements GeneradorDeIds {
  generarUsuarioId(): UsuarioId {
    return UsuarioId.of(randomUUID());
  }

  generarSesionId(): SesionId {
    return SesionId.of(randomUUID());
  }

  generarDispositivoId(): DispositivoId {
    return DispositivoId.of(randomUUID());
  }

  generarEventoId(): string {
    return randomUUID();
  }
}
