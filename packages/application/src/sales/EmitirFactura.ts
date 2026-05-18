import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Factura,
  FacturaId,
  FacturaLinea,
  CobroId,
  BusinessUnitIdRef,
  NumeroFactura,
  Dinero,
  TasaIVA,
  IdInvalidoError,
  EstadoDeCobro,
  CobroNoEncontradoError,
  CobroNoProcesadoError,
  ComandaNoEncontradaError,
  NumeroFacturaInvalidoError,
} from '@zahavi/domain-sales';
import type { ICobroRepository, IComandaRepository, IFacturaRepository } from '@zahavi/ports';

export interface EntradaEmitirFactura {
  readonly cobroId: string;
  readonly puntoDeVentaId: string;
}

export interface SalidaEmitirFactura {
  readonly facturaId: string;
  readonly numero: string;
  readonly total: number;
}

type ErrorEmitirFactura =
  | IdInvalidoError
  | CobroNoEncontradoError
  | CobroNoProcesadoError
  | ComandaNoEncontradaError
  | NumeroFacturaInvalidoError;

/**
 * Emite la factura interna a partir de un cobro PROCESADO.
 * Genera un snapshot inmutable de las líneas de la comanda.
 * El número de factura es secuencial por punto de venta (gestionado por el adapter).
 */
export class EmitirFactura {
  constructor(
    private readonly repoCobros: ICobroRepository,
    private readonly repoComanadas: IComandaRepository,
    private readonly repoFacturas: IFacturaRepository,
  ) {}

  async execute(
    entrada: EntradaEmitirFactura,
    correlacionId: string,
  ): Promise<Result<SalidaEmitirFactura, ErrorEmitirFactura>> {
    const cobroIdRes = CobroId.of(entrada.cobroId);
    if (!cobroIdRes.ok) return err(cobroIdRes.error);

    const puntoRes = BusinessUnitIdRef.of(entrada.puntoDeVentaId);
    if (!puntoRes.ok) return err(puntoRes.error);

    const cobro = await this.repoCobros.obtenerPorId(cobroIdRes.value);
    if (!cobro) {
      return err(new CobroNoEncontradoError(entrada.cobroId));
    }
    if (cobro.estado !== EstadoDeCobro.PROCESADO) {
      return err(new CobroNoProcesadoError(cobro.estado));
    }

    const comanda = await this.repoComanadas.obtenerPorId(cobro.comandaId);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(cobro.comandaId.toString()));
    }

    const numeroStr = await this.repoFacturas.siguienteNumero(entrada.puntoDeVentaId);
    const numeroRes = NumeroFactura.of(numeroStr);
    if (!numeroRes.ok) return err(numeroRes.error);

    // Snapshot de líneas activas de la comanda
    const lineasFactura: FacturaLinea[] = comanda.lineasActivas.map((l) =>
      FacturaLinea.crear({
        varianteId: l.varianteId,
        nombreProducto: l.nombreProducto,
        cantidad: l.cantidad,
        precioUnitario: Dinero.de(l.precioUnitario.valor).ok
          ? (Dinero.de(l.precioUnitario.valor) as { ok: true; value: Dinero }).value
          : Dinero.cero(),
        tasaIVA: TasaIVA.of(l.tasaIVA.valor).ok
          ? (TasaIVA.of(l.tasaIVA.valor) as { ok: true; value: TasaIVA }).value
          : TasaIVA.CERO,
      }),
    );

    const factura = Factura.emitir(
      {
        id: FacturaId.nuevo(),
        cobroId: cobroIdRes.value,
        comandaId: cobro.comandaId,
        puntoDeVentaId: puntoRes.value,
        numero: numeroRes.value,
        lineas: lineasFactura,
        ahora: FechaHora.ahora(),
      },
      correlacionId,
    );

    await this.repoFacturas.save(factura, correlacionId);
    return ok({
      facturaId: factura.id.toString(),
      numero: factura.numero.toString(),
      total: factura.total.valor,
    });
  }
}
