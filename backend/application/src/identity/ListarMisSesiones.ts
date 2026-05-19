import { UsuarioId } from '@zahavi/domain-identity';
import { ok } from '@zahavi/domain-shared-kernel';
import type { Result } from '@zahavi/domain-shared-kernel';
import type { RepositorioDeSesiones } from '@zahavi/ports';

export interface EntradaListarMisSesiones {
  readonly usuarioId: string;
}

export interface ResumenSesion {
  readonly sesionId: string;
  readonly rol: string;
  readonly iniciadaEn: string;
  readonly ultimaActividadEn: string;
  readonly expiraEn: string;
  readonly contextoDispositivo: string;
}

export interface SalidaListarMisSesiones {
  readonly sesiones: ReadonlyArray<ResumenSesion>;
}

/** Lista las sesiones activas del usuario autenticado. */
export class ListarMisSesiones {
  constructor(private readonly repoSesiones: RepositorioDeSesiones) {}

  async execute(
    entrada: EntradaListarMisSesiones,
    _correlacionId: string,
  ): Promise<Result<SalidaListarMisSesiones, never>> {
    const usuarioId = UsuarioId.of(entrada.usuarioId);
    const sesiones = await this.repoSesiones.listarActivasDeUsuario(usuarioId);

    return ok({
      sesiones: sesiones.map((s) => ({
        sesionId: s.id.toString(),
        rol: s.rol,
        iniciadaEn: s.iniciadaEn.toISOString(),
        ultimaActividadEn: s.ultimaActividadEn.toISOString(),
        expiraEn: s.expiraEnAbsoluto.toISOString(),
        contextoDispositivo: String(s.contextoDispositivo),
      })),
    });
  }
}
