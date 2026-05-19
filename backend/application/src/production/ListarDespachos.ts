import { type Result, ok, err } from '@zahavi/domain-shared-kernel';
import { OrdenDeProduccionId, IdInvalidoError } from '@zahavi/domain-production';
import type { IDespachoRepository } from '@zahavi/ports';

export interface EntradaListarDespachos {
  readonly ordenId: string;
}

export interface ResumenDespacho {
  readonly despachoId: string;
  readonly codigoLote: string;
  readonly cantidadDespachada: number;
  readonly puntoDeVentaDestinoId: string;
  readonly estado: string;
  readonly preparadoPor: string;
  readonly creadoEn: string;
}

export interface SalidaListarDespachos {
  readonly despachos: ReadonlyArray<ResumenDespacho>;
}

/** Lista todos los despachos de una orden de producción. */
export class ListarDespachos {
  constructor(private readonly reposDespachos: IDespachoRepository) {}

  async execute(
    entrada: EntradaListarDespachos,
  ): Promise<Result<SalidaListarDespachos, IdInvalidoError>> {
    const idRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!idRes.ok) return err(idRes.error);

    const despachos = await this.reposDespachos.listarPorOrden(idRes.value);
    return ok({
      despachos: despachos.map((d) => ({
        despachoId: d.id.toString(),
        codigoLote: d.codigoLote.toString(),
        cantidadDespachada: d.cantidadDespachada,
        puntoDeVentaDestinoId: d.puntoDeVentaDestinoId.toString(),
        estado: d.estado,
        preparadoPor: d.preparadoPor.toString(),
        creadoEn: d.creadoEn.toISOString(),
      })),
    });
  }
}
