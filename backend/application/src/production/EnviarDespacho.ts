import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  DespachoId,
  UsuarioIdRef,
  DespachoEnEstadoInvalidoError,
  IdInvalidoError,
} from '@zahavi/domain-production';
import type { IDespachoRepository } from '@zahavi/ports';

export interface EntradaEnviarDespacho {
  readonly despachoId: string;
  readonly enviadoPor: string;
}

export interface SalidaEnviarDespacho {
  readonly despachoId: string;
  readonly estado: string;
}

type ErrorEnviarDespacho = IdInvalidoError | DespachoEnEstadoInvalidoError;

/** Transiciona un Despacho de PREPARADO → EN_TRANSITO. */
export class EnviarDespacho {
  constructor(private readonly reposDespachos: IDespachoRepository) {}

  async execute(
    entrada: EntradaEnviarDespacho,
    correlacionId: string,
  ): Promise<Result<SalidaEnviarDespacho, ErrorEnviarDespacho>> {
    const idRes = DespachoId.of(entrada.despachoId);
    if (!idRes.ok) return err(idRes.error);

    const usuarioRes = UsuarioIdRef.of(entrada.enviadoPor);
    if (!usuarioRes.ok) return err(usuarioRes.error);

    const despacho = await this.reposDespachos.obtenerPorId(idRes.value);
    if (!despacho) return err(new IdInvalidoError('DespachoId', entrada.despachoId));

    const res = despacho.enviar(usuarioRes.value, FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.reposDespachos.update(res.value, correlacionId);
    return ok({ despachoId: res.value.id.toString(), estado: res.value.estado });
  }
}
