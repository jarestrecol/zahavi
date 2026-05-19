import {
  type Result,
  ok,
  err,
  UsuarioId,
  SesionId,
  type SesionNoEncontradaError as SesionNoEncontradaErrorType,
  SesionNoEncontradaError,
  type SesionYaCerradaError,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeSesiones,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export interface EntradaCerrarSesion {
  sesionId: string;
  usuarioId: string;
}

type ErrorCerrarSesion = SesionNoEncontradaErrorType | SesionYaCerradaError;

export class CerrarSesion {
  constructor(
    private readonly reposSesiones: RepositorioDeSesiones,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(entrada: EntradaCerrarSesion): Promise<Result<void, ErrorCerrarSesion>> {
    const sesionId = SesionId.of(entrada.sesionId);
    const sesion = await this.reposSesiones.obtenerPorId(sesionId);
    if (sesion === null) {
      return err(new SesionNoEncontradaError(entrada.sesionId));
    }

    const usuarioId = UsuarioId.of(entrada.usuarioId);
    if (!sesion.usuarioId.equals(usuarioId)) {
      // Invariante de seguridad: el JWT del actor no coincide con el dueño de la sesión.
      // Esto no debe ocurrir en flujo normal; el controlador HTTP garantiza la coincidencia.
      throw new Error(
        `Intento de cerrar sesión ajena: actor=${entrada.usuarioId}, duenio=${sesion.usuarioId}`,
      );
    }

    const ahora = this.reloj.ahora();
    const eventoId = this.ids.generarEventoId();

    const resultado = sesion.cerrarVoluntariamente(ahora, eventoId);
    if (!resultado.ok) return resultado;

    await this.reposSesiones.guardar(resultado.value);
    await this.eventos.publicar(resultado.value.pullDomainEvents());

    return ok(undefined);
  }
}
