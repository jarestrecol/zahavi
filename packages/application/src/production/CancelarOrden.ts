import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccionId,
  UsuarioIdRef,
  IdInvalidoError,
  OrdenNoCancelableError,
  CancelacionSinJustificacionError,
  OrdenNoEncontradaError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

export interface EntradaCancelarOrden {
  readonly ordenId: string;
  readonly motivo: string;
  readonly canceladaPor: string;
}

export interface SalidaCancelarOrden {
  readonly ordenId: string;
  readonly estado: string;
}

type ErrorCancelarOrden =
  | IdInvalidoError
  | OrdenNoCancelableError
  | CancelacionSinJustificacionError
  | OrdenNoEncontradaError;

/** Cancela una orden desde PLANIFICADA o RESERVADA. Requiere motivo. */
export class CancelarOrden {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

  async execute(
    entrada: EntradaCancelarOrden,
    correlacionId: string,
  ): Promise<Result<SalidaCancelarOrden, ErrorCancelarOrden>> {
    const ordenIdRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!ordenIdRes.ok) return err(ordenIdRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.canceladaPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(ordenIdRes.value);
    if (!orden) return err(new OrdenNoEncontradaError(entrada.ordenId));

    const res = orden.cancelar(
      entrada.motivo,
      usuarioIdRes.value,
      FechaHora.ahora(),
      correlacionId,
    );
    if (!res.ok) return err(res.error);

    await this.reposOrdenes.update(res.value, correlacionId);
    return ok({ ordenId: entrada.ordenId, estado: res.value.estado });
  }
}
