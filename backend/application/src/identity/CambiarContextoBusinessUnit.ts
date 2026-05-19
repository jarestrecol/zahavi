import {
  type Result,
  ok,
  err,
  UsuarioId,
  AccesoDenegadoError,
  AccesoDenegadoError as AccesoDenegadoErrorImpl,
  CredencialesInvalidasError,
  CredencialesInvalidasError as CredencialesInvalidasErrorImpl,
} from '@zahavi/domain-identity';
import type { RepositorioDeUsuarios, RepositorioDeUnidadesDeNegocio } from '@zahavi/ports';

export interface EntradaCambiarContextoBusinessUnit {
  usuarioId: string;
  nuevoBusinessUnitId: string;
}

export interface SalidaCambiarContextoBusinessUnit {
  businessUnitId: string;
}

type ErrorCambiarContexto = CredencialesInvalidasError | AccesoDenegadoError;

/**
 * Valida que el usuario tiene acceso a la unidad solicitada y devuelve el ID confirmado
 * para que el route emita un JWT nuevo con el contexto actualizado.
 * WORKER no puede cambiar contexto — siempre tiene exactamente una unidad asignada.
 */
export class CambiarContextoBusinessUnit {
  constructor(
    private readonly reposUsuarios: RepositorioDeUsuarios,
    private readonly reposUnidades: RepositorioDeUnidadesDeNegocio,
  ) {}

  async execute(
    entrada: EntradaCambiarContextoBusinessUnit,
  ): Promise<Result<SalidaCambiarContextoBusinessUnit, ErrorCambiarContexto>> {
    const usuarioId = UsuarioId.of(entrada.usuarioId);
    const usuario = await this.reposUsuarios.obtenerPorId(usuarioId);

    if (!usuario || usuario.estado === 'deshabilitado') {
      return err(new CredencialesInvalidasErrorImpl());
    }

    if (usuario.rol === 'WORKER') {
      return err(
        new AccesoDenegadoErrorImpl('WORKER no puede cambiar el contexto de unidad de negocio'),
      );
    }

    const tieneAcceso = await this.reposUnidades.perteneceAlUsuario(
      usuarioId,
      entrada.nuevoBusinessUnitId,
    );

    if (!tieneAcceso) {
      // Respuesta generica para no revelar si la unidad existe
      return err(new AccesoDenegadoErrorImpl('Sin acceso a la unidad de negocio solicitada'));
    }

    return ok({ businessUnitId: entrada.nuevoBusinessUnitId });
  }
}
