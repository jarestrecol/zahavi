import { type Result, ok, err } from '@zahavi/domain-shared-kernel';
import { ComandaId, ComandaNoEncontradaError } from '@zahavi/domain-sales';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaObtenerComanda {
  readonly comandaId: string;
}

export interface LineaComandaDetalle {
  readonly lineaId: string;
  readonly varianteId: string;
  readonly nombreProducto: string;
  readonly cantidad: number;
  readonly precioUnitarioCOP: number;
  readonly subtotalConIVA: number;
}

export interface SalidaObtenerComanda {
  readonly comandaId: string;
  readonly mesaId: string;
  readonly estado: string;
  readonly totalConIVA: number;
  readonly lineas: ReadonlyArray<LineaComandaDetalle>;
  readonly abiertaEn: string;
}

type ErrorObtenerComanda = ComandaNoEncontradaError;

/** Obtiene el detalle completo de una comanda incluyendo sus líneas activas. */
export class ObtenerComanda {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaObtenerComanda,
    _correlacionId: string,
  ): Promise<Result<SalidaObtenerComanda, ErrorObtenerComanda>> {
    const idRes = ComandaId.of(entrada.comandaId);
    if (!idRes.ok) return err(new ComandaNoEncontradaError(entrada.comandaId));

    const comanda = await this.repoComanadas.obtenerPorId(idRes.value);
    if (!comanda) return err(new ComandaNoEncontradaError(entrada.comandaId));

    return ok({
      comandaId: comanda.id.toString(),
      mesaId: comanda.mesaId.toString(),
      estado: comanda.estado,
      totalConIVA: comanda.totalConIVA.valor,
      abiertaEn: comanda.abiertaEn.toISOString(),
      lineas: comanda.lineasActivas.map((l) => ({
        lineaId: l.id.toString(),
        varianteId: l.varianteId.toString(),
        nombreProducto: l.nombreProducto,
        cantidad: l.cantidad,
        precioUnitarioCOP: l.precioUnitario.valor,
        subtotalConIVA: l.subtotalConIVA.valor,
      })),
    });
  }
}
