import {
  type Result,
  ok,
  err,
  UsuarioId,
  type CredencialIncoherenteConRolError,
  UsuarioNoEncontradoError,
  type UsuarioNoEncontradoError as UsuarioNoEncontradoErrorType,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  VerificadorDeTotp,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export interface EntradaIniciarEnrolamientoTotp {
  usuarioId: string;
}

export interface SalidaIniciarEnrolamientoTotp {
  otpAuthUrl: string;
  secretoBase32: string;
}

type ErrorIniciarEnrolamiento = UsuarioNoEncontradoErrorType | CredencialIncoherenteConRolError;

export class IniciarEnrolamientoTotp {
  constructor(
    private readonly repos: RepositorioDeUsuarios,
    private readonly verificadorTotp: VerificadorDeTotp,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(
    entrada: EntradaIniciarEnrolamientoTotp,
  ): Promise<Result<SalidaIniciarEnrolamientoTotp, ErrorIniciarEnrolamiento>> {
    const usuarioId = UsuarioId.of(entrada.usuarioId);
    const usuario = await this.repos.obtenerPorId(usuarioId);
    if (usuario === null) {
      return err(new UsuarioNoEncontradoError(entrada.usuarioId));
    }

    const secreto = await this.verificadorTotp.generarSecreto();
    const ahora = this.reloj.ahora();
    const eventoId = this.ids.generarEventoId();

    const resultado = usuario.registrarSecretoTotp(secreto, ahora, eventoId);
    if (!resultado.ok) return resultado;

    const usuarioActualizado = resultado.value;
    await this.repos.guardar(usuarioActualizado);
    await this.eventos.publicar(usuarioActualizado.pullDomainEvents());

    const otpAuthUrl = this.verificadorTotp.urlDeEnrolamiento(secreto, usuario.email);

    // El secreto se expone una única vez al usuario para completar el enrolamiento; nunca se vuelve a serializar
    return ok({
      otpAuthUrl,
      secretoBase32: secreto._unsafeRead(),
    });
  }
}
