import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  LineaDeComandaId,
  ProductVariantIdRef,
  Dinero,
  TasaIVA,
  IdInvalidoError,
  MontoInvalidoError,
  TasaIVAInvalidaError,
  ComandaNoModificableError,
  CantidadDeLineaInvalidaError,
  ComandaNoEncontradaError,
  ProductoNoEncontradoError,
} from '@zahavi/domain-sales';
import type { IComandaRepository, IConsultorDeProductoParaVentas } from '@zahavi/ports';

export interface EntradaAgregarLinea {
  readonly comandaId: string;
  readonly varianteId: string;
  readonly cantidad: number;
}

export interface SalidaAgregarLinea {
  readonly lineaId: string;
  readonly subtotalConIVA: number;
  readonly totalComandaConIVA: number;
}

type ErrorAgregarLinea =
  | IdInvalidoError
  | MontoInvalidoError
  | TasaIVAInvalidaError
  | ComandaNoModificableError
  | CantidadDeLineaInvalidaError
  | ComandaNoEncontradaError
  | ProductoNoEncontradoError;

/**
 * Agrega una línea a una comanda ABIERTA.
 *
 * Invoca el ACL `IConsultorDeProductoParaVentas` para resolver nombre, precio
 * y tasa IVA del producto antes de pasarlos al aggregate Comanda.
 */
export class AgregarLineaAComanda {
  constructor(
    private readonly repoComanadas: IComandaRepository,
    private readonly consultorProducto: IConsultorDeProductoParaVentas,
  ) {}

  async execute(
    entrada: EntradaAgregarLinea,
    correlacionId: string,
  ): Promise<Result<SalidaAgregarLinea, ErrorAgregarLinea>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const varianteIdRes = ProductVariantIdRef.of(entrada.varianteId);
    if (!varianteIdRes.ok) return err(varianteIdRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }

    const datosProducto = await this.consultorProducto.obtenerDatosDeVenta(entrada.varianteId);
    if (!datosProducto) {
      return err(new ProductoNoEncontradoError(entrada.varianteId));
    }

    const precioRes = Dinero.de(datosProducto.precioUnitario);
    if (!precioRes.ok) return err(precioRes.error);

    const tasaRes = TasaIVA.of(datosProducto.tasaIVA);
    if (!tasaRes.ok) return err(tasaRes.error);

    const lineaId = LineaDeComandaId.nuevo();
    const ahora = FechaHora.ahora();

    const comandaActualizadaRes = comanda.agregarLinea(
      {
        lineaId,
        producto: {
          varianteId: varianteIdRes.value,
          nombreProducto: datosProducto.nombre,
          precioUnitario: precioRes.value,
          tasaIVA: tasaRes.value,
        },
        cantidad: entrada.cantidad,
        ahora,
      },
      correlacionId,
    );

    if (!comandaActualizadaRes.ok) return err(comandaActualizadaRes.error);

    await this.repoComanadas.update(comandaActualizadaRes.value, correlacionId);

    const linea = comandaActualizadaRes.value.lineas.find((l) => l.id.equals(lineaId));
    return ok({
      lineaId: lineaId.toString(),
      subtotalConIVA: linea?.subtotalConIVA.valor ?? 0,
      totalComandaConIVA: comandaActualizadaRes.value.totalConIVA.valor,
    });
  }
}
