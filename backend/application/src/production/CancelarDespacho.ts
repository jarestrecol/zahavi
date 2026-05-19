import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  DespachoId,
  UsuarioIdRef,
  DespachoEnEstadoInvalidoError,
  CancelacionDeDespachoSinJustificacionError,
  IdInvalidoError,
} from '@zahavi/domain-production';
import type { IDespachoRepository } from '@zahavi/ports';

export interface EntradaCancelarDespacho {
  readonly despachoId: string;
  readonly motivo: string;
  readonly canceladoPor: string;
}

export interface SalidaCancelarDespacho {
  readonly despachoId: string;
  readonly estado: string;
}

type ErrorCancelarDespacho =
  | IdInvalidoError
  | CancelacionDeDespachoSinJustificacionError
  | DespachoEnEstadoInvalidoError;

/** Cancela un Despacho desde PREPARADO o EN_TRANSITO. Requiere motivo. */
export class CancelarDespacho {
  constructor(private readonly reposDespachos: IDespachoRepository) {}

  async execute(
    entrada: EntradaCancelarDespacho,
    correlacionId: string,
  ): Promise<Result<SalidaCancelarDespacho, ErrorCancelarDespacho>> {
    const idRes = DespachoId.of(entrada.despachoId);
    if (!idRes.ok) return err(idRes.error);

    const usuarioRes = UsuarioIdRef.of(entrada.canceladoPor);
    if (!usuarioRes.ok) return err(usuarioRes.error);

    const despacho = await this.reposDespachos.obtenerPorId(idRes.value);
    if (!despacho) return err(new IdInvalidoError('DespachoId', entrada.despachoId));

    const res = despacho.cancelar(
      entrada.motivo,
      usuarioRes.value,
      FechaHora.ahora(),
      correlacionId,
    );
    if (!res.ok) return err(res.error);

    await this.reposDespachos.update(res.value, correlacionId);
    return ok({ despachoId: res.value.id.toString(), estado: res.value.estado });
  }
}
