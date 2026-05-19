import {
  type Result,
  ok,
  err,
  UsuarioId,
  SesionId,
  type Rol,
  type SesionNoEncontradaError as SesionNoEncontradaErrorType,
  SesionNoEncontradaError,
  type UsuarioNoEncontradoError as UsuarioNoEncontradoErrorType,
  UsuarioNoEncontradoError,
  type RolNoAutorizadoParaCrearError as RolNoAutorizadoErrorType,
  RolNoAutorizadoParaCrearError,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeSesiones,
  RepositorioDeUsuarios,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export interface EntradaRevocarSesion {
  actorId: string;
  actorRol: Rol;
  sesionId: string;
}

type ErrorRevocarSesion =
  | SesionNoEncontradaErrorType
  | UsuarioNoEncontradoErrorType
  | RolNoAutorizadoErrorType;

export class RevocarSesion {
  constructor(
    private readonly reposSesiones: RepositorioDeSesiones,
    private readonly reposUsuarios: RepositorioDeUsuarios,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(entrada: EntradaRevocarSesion): Promise<Result<void, ErrorRevocarSesion>> {
    const sesionId = SesionId.of(entrada.sesionId);
    const sesion = await this.reposSesiones.obtenerPorId(sesionId);
    if (sesion === null) {
      return err(new SesionNoEncontradaError(entrada.sesionId));
    }

    // Cargar el usuario dueño para verificar autorización
    const usuarioDuenio = await this.reposUsuarios.obtenerPorId(sesion.usuarioId);
    if (usuarioDuenio === null) {
      return err(new UsuarioNoEncontradoError(sesion.usuarioId.toString()));
    }

    // ADMIN solo puede revocar sesiones de WORKERs
    if (entrada.actorRol === 'ADMIN' && usuarioDuenio.rol !== 'WORKER') {
      return err(
        new RolNoAutorizadoParaCrearError(
          entrada.actorRol,
          `revocar sesiones de ${usuarioDuenio.rol}`,
        ),
      );
    }

    // WORKER no puede revocar sesiones de otros (solo cerrar la propia)
    if (entrada.actorRol === 'WORKER') {
      return err(new RolNoAutorizadoParaCrearError(entrada.actorRol, 'revocar sesiones'));
    }

    const actorId = UsuarioId.of(entrada.actorId);
    const ahora = this.reloj.ahora();
    const eventoId = this.ids.generarEventoId();

    const sesionRevocada = sesion.revocar('revocada_por_admin', ahora, eventoId, actorId);

    await this.reposSesiones.guardar(sesionRevocada);
    await this.eventos.publicar(sesionRevocada.pullDomainEvents());

    return ok(undefined);
  }
}
