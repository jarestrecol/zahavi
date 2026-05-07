import {
  type Result,
  ok,
  err,
  UsuarioId,
  CodigoTotp,
  type PinInvalidoError,
  type CredencialIncoherenteConRolError,
  UsuarioNoEncontradoError,
  type UsuarioNoEncontradoError as UsuarioNoEncontradoErrorType,
  CredencialesInvalidasError,
  type CredencialesInvalidasError as CredencialesInvalidasErrorType,
  TotpNoVerificadoError,
  type TotpNoVerificadoError as TotpNoVerificadoErrorType,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  VerificadorDeTotp,
  Reloj,
  GeneradorDeIds,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export interface EntradaConfirmarTotp {
  usuarioId: string;
  codigoTotp: string;
}

type ErrorConfirmarTotp =
  | UsuarioNoEncontradoErrorType
  | TotpNoVerificadoErrorType
  | CredencialIncoherenteConRolError
  | CredencialesInvalidasErrorType
  | PinInvalidoError;

export class ConfirmarTotp {
  constructor(
    private readonly repos: RepositorioDeUsuarios,
    private readonly verificadorTotp: VerificadorDeTotp,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(entrada: EntradaConfirmarTotp): Promise<Result<void, ErrorConfirmarTotp>> {
    const usuarioId = UsuarioId.of(entrada.usuarioId);
    const usuario = await this.repos.obtenerPorId(usuarioId);
    if (usuario === null) {
      return err(new UsuarioNoEncontradoError(entrada.usuarioId));
    }

    if (usuario.credencial.tipo !== 'navegador' || usuario.credencial.secretoTotp === null) {
      return err(new TotpNoVerificadoError());
    }

    const codigoResult = CodigoTotp.of(entrada.codigoTotp);
    if (!codigoResult.ok) return codigoResult;

    const ahora = this.reloj.ahora();
    const codigoOk = await this.verificadorTotp.verificar(
      codigoResult.value,
      usuario.credencial.secretoTotp,
      ahora,
    );
    if (!codigoOk) return err(new CredencialesInvalidasError());

    const eventoId = this.ids.generarEventoId();
    const resultado = usuario.confirmarTotp(ahora, eventoId);
    if (!resultado.ok) return resultado;

    await this.repos.guardar(resultado.value);
    await this.eventos.publicar(resultado.value.pullDomainEvents());

    return ok(undefined);
  }
}
