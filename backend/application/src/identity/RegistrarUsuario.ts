import {
  type Result,
  ok,
  err,
  Email,
  NombreCompleto,
  Usuario,
  UsuarioId,
  type Rol,
  type Credencial,
  type CredencialDeNavegador,
  type CredencialDeTablet,
  type EmailInvalidoError,
  type NombreCompletoInvalidoError,
  type ContrasenaDebilError,
  type PinInvalidoError,
  type CredencialIncoherenteConRolError,
  type RolNoAutorizadoParaCrearError,
  EmailYaRegistradoError,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  VerificadorDeContrasena,
  VerificadorDePin,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export type EntradaRegistrarUsuario = {
  email: string;
  nombreCompleto: string;
  rol: Rol;
  actorId: string | null;
  actorRol: Rol | null;
} & (
  | { tipoCredencial: 'navegador'; contrasenaEnClaro: string }
  | { tipoCredencial: 'tablet'; pinEnClaro: string }
);

export interface SalidaRegistrarUsuario {
  usuarioId: string;
  email: string;
  rol: Rol;
}

type ErrorRegistrar =
  | EmailInvalidoError
  | NombreCompletoInvalidoError
  | EmailYaRegistradoError
  | ContrasenaDebilError
  | PinInvalidoError
  | CredencialIncoherenteConRolError
  | RolNoAutorizadoParaCrearError;

export class RegistrarUsuario {
  constructor(
    private readonly repos: RepositorioDeUsuarios,
    private readonly verificadorContrasena: VerificadorDeContrasena,
    private readonly verificadorPin: VerificadorDePin,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(
    entrada: EntradaRegistrarUsuario,
  ): Promise<Result<SalidaRegistrarUsuario, ErrorRegistrar>> {
    const emailResult = Email.of(entrada.email);
    if (!emailResult.ok) return emailResult;
    const email = emailResult.value;

    const nombreResult = NombreCompleto.of(entrada.nombreCompleto);
    if (!nombreResult.ok) return nombreResult;
    const nombre = nombreResult.value;

    const emailExiste = await this.repos.existeEmail(email);
    if (emailExiste) return err(new EmailYaRegistradoError(entrada.email));

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

    const actorIdVo = entrada.actorId !== null ? UsuarioId.of(entrada.actorId) : null;
    const ahora = this.reloj.ahora();
    const id = this.ids.generarUsuarioId();
    const eventoId = this.ids.generarEventoId();

    const usuarioResult = Usuario.crear(
      {
        id,
        email,
        nombre,
        rol: entrada.rol,
        credencial,
        ahora,
        creadoPor: actorIdVo,
        actorRol: entrada.actorRol,
      },
      eventoId,
    );
    if (!usuarioResult.ok) return usuarioResult;
    const usuario = usuarioResult.value;

    await this.repos.guardar(usuario);
    await this.eventos.publicar(usuario.pullDomainEvents());

    return ok({ usuarioId: id.toString(), email: email.toString(), rol: entrada.rol });
  }
}
