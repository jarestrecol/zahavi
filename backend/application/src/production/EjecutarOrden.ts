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
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

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
 * Cierra la producción: produce el lote y calcula el consumo real de ingredientes
 * (BOM menos mermas reportadas). El consumoReal queda en el evento de dominio
 * `OrdenDeProduccionEjecutada` para que Inventory lo procese de forma eventual.
 */
export class EjecutarOrden {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

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

    // Extraer consumoReal del evento de dominio para devolverlo en la salida
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

    return ok({
      ordenId: entrada.ordenId,
      codigoLote: entrada.codigoLote,
      cantidadProducida: entrada.cantidadProducida,
      consumoReal,
    });
  }
}
