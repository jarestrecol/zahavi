import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  DespachoId,
  UsuarioIdRef,
  DespachoEnEstadoInvalidoError,
  IdInvalidoError,
} from '@zahavi/domain-production';
import type { IDespachoRepository } from '@zahavi/ports';

export interface EntradaEntregarDespacho {
  readonly despachoId: string;
  readonly entregadoPor: string;
  readonly recibidoPor: string;
}

export interface SalidaEntregarDespacho {
  readonly despachoId: string;
  readonly estado: string;
}

type ErrorEntregarDespacho = IdInvalidoError | DespachoEnEstadoInvalidoError;

/** Transiciona un Despacho de EN_TRANSITO → ENTREGADO. */
export class EntregarDespacho {
  constructor(private readonly reposDespachos: IDespachoRepository) {}

  async execute(
    entrada: EntradaEntregarDespacho,
    correlacionId: string,
  ): Promise<Result<SalidaEntregarDespacho, ErrorEntregarDespacho>> {
    const idRes = DespachoId.of(entrada.despachoId);
    if (!idRes.ok) return err(idRes.error);

    const entregadoPorRes = UsuarioIdRef.of(entrada.entregadoPor);
    if (!entregadoPorRes.ok) return err(entregadoPorRes.error);

    const recibidoPorRes = UsuarioIdRef.of(entrada.recibidoPor);
    if (!recibidoPorRes.ok) return err(recibidoPorRes.error);

    const despacho = await this.reposDespachos.obtenerPorId(idRes.value);
    if (!despacho) return err(new IdInvalidoError('DespachoId', entrada.despachoId));

    const res = despacho.entregar(
      entregadoPorRes.value,
      recibidoPorRes.value,
      FechaHora.ahora(),
      correlacionId,
    );
    if (!res.ok) return err(res.error);

    await this.reposDespachos.update(res.value, correlacionId);
    return ok({ despachoId: res.value.id.toString(), estado: res.value.estado });
  }
}
