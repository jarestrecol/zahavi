import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccionId,
  CodigoDeLote,
  UsuarioIdRef,
  IdInvalidoError,
  TransicionDeEstadoInvalidaError,
  CantidadProducidaInvalidaError,
  CodigoDeLoteInvalidoError,
  OrdenNoEncontradaError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository, IDescontadorDeInventario } from '@zahavi/ports';

export interface EntradaEjecutarOrden {
  readonly ordenId: string;
  readonly cantidadProducida: number;
  readonly codigoLote: string;
  readonly ejecutadaPor: string;
}

export interface SalidaEjecutarOrden {
  readonly ordenId: string;
  readonly codigoLote: string;
  readonly cantidadProducida: number;
  readonly consumoReal: ReadonlyArray<{
    readonly ingredientId: string;
    readonly cantidadConsumida: number;
    readonly unidad: string;
  }>;
}

type ErrorEjecutarOrden =
  | IdInvalidoError
  | TransicionDeEstadoInvalidaError
  | CantidadProducidaInvalidaError
  | CodigoDeLoteInvalidoError
  | OrdenNoEncontradaError;

/**
 * Cierra la producción: produce el lote, calcula el consumo real (BOM − mermas)
 * y descuenta los ingredientes del inventario de la planta central vía ACL.
 */
export class EjecutarOrden {
  constructor(
    private readonly reposOrdenes: IOrdenDeProduccionRepository,
    private readonly descontador: IDescontadorDeInventario,
  ) {}

  async execute(
    entrada: EntradaEjecutarOrden,
    correlacionId: string,
  ): Promise<Result<SalidaEjecutarOrden, ErrorEjecutarOrden>> {
    const ordenIdRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!ordenIdRes.ok) return err(ordenIdRes.error);

    const loteRes = CodigoDeLote.of(entrada.codigoLote);
    if (!loteRes.ok) return err(loteRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.ejecutadaPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(ordenIdRes.value);
    if (!orden) return err(new OrdenNoEncontradaError(entrada.ordenId));

    const res = orden.ejecutar(
      entrada.cantidadProducida,
      loteRes.value,
      usuarioIdRes.value,
      FechaHora.ahora(),
      correlacionId,
    );
    if (!res.ok) return err(res.error);

    await this.reposOrdenes.update(res.value, correlacionId);

    const eventos = res.value.pullDomainEvents();
    const eventoEjecutada = eventos.find((e) => e.tipo === 'OrdenDeProduccionEjecutada');
    type EjecutadaPayload = {
      payload: {
        consumoReal: ReadonlyArray<{
          ingredientId: string;
          cantidadConsumida: number;
          unidad: string;
        }>;
      };
    };
    const consumoReal = eventoEjecutada
      ? (eventoEjecutada as unknown as EjecutadaPayload).payload.consumoReal
      : [];

    if (consumoReal.length > 0) {
      await this.descontador.descontarConsumoDeProduccion(
        consumoReal,
        orden.plantaCentralId.toString(),
        entrada.ordenId,
        correlacionId,
      );
    }

    return ok({
      ordenId: entrada.ordenId,
      codigoLote: entrada.codigoLote,
      cantidadProducida: entrada.cantidadProducida,
      consumoReal,
    });
  }
}
