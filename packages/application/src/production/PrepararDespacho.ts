import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  DespachoAPunto,
  DespachoId,
  OrdenDeProduccionId,
  CodigoDeLote,
  BusinessUnitIdRef,
  UsuarioIdRef,
  EstadoDeOrdenDeProduccion,
  IdInvalidoError,
  CantidadDespachadaInvalidaError,
  CantidadDespachadaExcedeLoteError,
  DestinoDespachoInvalidoError,
  CodigoDeLoteInvalidoError,
  OrdenNoEncontradaError,
  OrdenNoEjecutadaError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository, IDespachoRepository } from '@zahavi/ports';

export interface EntradaPrepararDespacho {
  readonly ordenId: string;
  readonly cantidadDespachada: number;
  readonly puntoDeVentaDestinoId: string;
  readonly preparadoPor: string;
}

export interface SalidaPrepararDespacho {
  readonly despachoId: string;
  readonly ordenId: string;
  readonly estado: string;
}

type ErrorPrepararDespacho =
  | IdInvalidoError
  | CantidadDespachadaInvalidaError
  | CantidadDespachadaExcedeLoteError
  | DestinoDespachoInvalidoError
  | CodigoDeLoteInvalidoError
  | OrdenNoEncontradaError
  | OrdenNoEjecutadaError;

/**
 * Crea un Despacho desde una OrdenDeProduccion ejecutada.
 * La orden debe estar en estado EJECUTADA y tener un lote producido.
 */
export class PrepararDespacho {
  constructor(
    private readonly reposOrdenes: IOrdenDeProduccionRepository,
    private readonly reposDespachos: IDespachoRepository,
  ) {}

  async execute(
    entrada: EntradaPrepararDespacho,
    correlacionId: string,
  ): Promise<Result<SalidaPrepararDespacho, ErrorPrepararDespacho>> {
    const ordenIdRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!ordenIdRes.ok) return err(ordenIdRes.error);

    const puntoIdRes = BusinessUnitIdRef.of(entrada.puntoDeVentaDestinoId);
    if (!puntoIdRes.ok) return err(puntoIdRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.preparadoPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(ordenIdRes.value);
    if (!orden) return err(new OrdenNoEncontradaError(entrada.ordenId));

    if (orden.estado !== EstadoDeOrdenDeProduccion.EJECUTADA || !orden.lote) {
      return err(new OrdenNoEjecutadaError(entrada.ordenId));
    }

    const loteRes = CodigoDeLote.of(orden.lote.codigo.toString());
    if (!loteRes.ok) return err(loteRes.error);

    const res = DespachoAPunto.preparar(
      {
        id: DespachoId.nuevo(),
        ordenId: ordenIdRes.value,
        codigoLote: loteRes.value,
        cantidadDespachada: entrada.cantidadDespachada,
        loteCantidadTotal: orden.lote.cantidadProducida,
        plantaCentralId: orden.plantaCentralId,
        puntoDeVentaDestinoId: puntoIdRes.value,
        preparadoPor: usuarioIdRes.value,
        ahora: FechaHora.ahora(),
      },
      correlacionId,
    );

    if (!res.ok) return err(res.error);

    await this.reposDespachos.save(res.value, correlacionId);
    return ok({
      despachoId: res.value.id.toString(),
      ordenId: entrada.ordenId,
      estado: res.value.estado,
    });
  }
}
