import {
  type Result,
  ok,
  err,
  UsuarioId,
  type Rol,
  type Credencial,
  type CredencialDeNavegador,
  type CredencialDeTablet,
  type ContrasenaDebilError,
  type PinInvalidoError,
  type CredencialIncoherenteConRolError,
  type RolNoAutorizadoParaCrearError,
  type UltimoSuperadminProtegidoError,
  type UsuarioNoActivoError,
  UsuarioNoEncontradoError,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  VerificadorDeContrasena,
  VerificadorDePin,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export type EntradaAsignarRol = {
  actorId: string;
  actorRol: Rol;
  usuarioObjetivoId: string;
  nuevoRol: Rol;
} & (
  | { tipoCredencial: 'navegador'; contrasenaEnClaro: string }
  | { tipoCredencial: 'tablet'; pinEnClaro: string }
);

type ErrorAsignarRol =
  | UsuarioNoEncontradoError
  | ContrasenaDebilError
  | PinInvalidoError
  | CredencialIncoherenteConRolError
  | RolNoAutorizadoParaCrearError
  | UltimoSuperadminProtegidoError
  | UsuarioNoActivoError;

export class AsignarRol {
  constructor(
    private readonly repos: RepositorioDeUsuarios,
    private readonly verificadorContrasena: VerificadorDeContrasena,
    private readonly verificadorPin: VerificadorDePin,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(entrada: EntradaAsignarRol): Promise<Result<void, ErrorAsignarRol>> {
    const actorId = UsuarioId.of(entrada.actorId);
    const objetivoId = UsuarioId.of(entrada.usuarioObjetivoId);

    const objetivo = await this.repos.obtenerPorId(objetivoId);
    if (objetivo === null) {
      return err(new UsuarioNoEncontradoError(entrada.usuarioObjetivoId));
    }

    let credencial: Credencial;
    if (entrada.tipoCredencial === 'navegador') {
      const politicaResult = this.verificadorContrasena.validarPolitica(entrada.contrasenaEnClaro);
      if (!politicaResult.ok) return politicaResult;
      const hash = await this.verificadorContrasena.hashear(entrada.contrasenaEnClaro);
      const cred: CredencialDeNavegador = {
        tipo: 'navegador',
        hashDeContrasena: hash,
        secretoTotp: null,
        totpVerificado: false,
      };
      credencial = cred;
    } else {
      const formatoResult = this.verificadorPin.validarFormato(entrada.pinEnClaro);
      if (!formatoResult.ok) return formatoResult;
      const hash = await this.verificadorPin.hashear(entrada.pinEnClaro);
      const cred: CredencialDeTablet = { tipo: 'tablet', hashDePin: hash };
      credencial = cred;
    }

    // Determinar si hay protección por último SUPERADMIN
    const estaEsElUltimoSuperadmin =
      objetivo.rol === 'SUPERADMIN' && entrada.nuevoRol !== 'SUPERADMIN'
        ? (await this.repos.contarSuperadminsActivos()) <= 1
        : false;

    const ahora = this.reloj.ahora();
    const eventoId = this.ids.generarEventoId();

    const resultado = objetivo.cambiarRol(
      entrada.nuevoRol,
      credencial,
      actorId,
      entrada.actorRol,
      ahora,
      eventoId,
      estaEsElUltimoSuperadmin,
    );
    if (!resultado.ok) return resultado;

    await this.repos.guardar(resultado.value);
    await this.eventos.publicar(resultado.value.pullDomainEvents());

    return ok(undefined);
  }
}
