import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccionId,
  UsuarioIdRef,
  IdInvalidoError,
  TransicionDeEstadoInvalidaError,
  OrdenNoEncontradaError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

export interface EntradaIniciarOrden {
  readonly ordenId: string;
  readonly iniciadaPor: string;
}

export interface SalidaIniciarOrden {
  readonly ordenId: string;
  readonly estado: string;
}

type ErrorIniciarOrden = IdInvalidoError | TransicionDeEstadoInvalidaError | OrdenNoEncontradaError;

/** Transiciona la orden de RESERVADA a EN_EJECUCION. */
export class IniciarOrden {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

  async execute(
    entrada: EntradaIniciarOrden,
    correlacionId: string,
  ): Promise<Result<SalidaIniciarOrden, ErrorIniciarOrden>> {
    const idRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!idRes.ok) return err(idRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.iniciadaPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(idRes.value);
    if (!orden) return err(new OrdenNoEncontradaError(entrada.ordenId));

    const res = orden.iniciar(usuarioIdRes.value, FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.reposOrdenes.update(res.value, correlacionId);
    return ok({ ordenId: entrada.ordenId, estado: res.value.estado });
  }
}
