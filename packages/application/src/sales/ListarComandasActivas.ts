import { type Result, ok } from '@zahavi/domain-shared-kernel';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaListarComandasActivas {
  readonly puntoDeVentaId: string;
}

export interface ResumenComanda {
  readonly comandaId: string;
  readonly mesaId: string;
  readonly estado: string;
  readonly totalConIVA: number;
  readonly cantidadLineas: number;
  readonly abiertaEn: string;
}

export interface SalidaListarComandasActivas {
  readonly comandas: ReadonlyArray<ResumenComanda>;
}

/** Lista las comandas activas (no CERRADAS ni CANCELADAS) de un punto de venta. */
export class ListarComandasActivas {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaListarComandasActivas,
    _correlacionId: string,
  ): Promise<Result<SalidaListarComandasActivas, never>> {
    const comandas = await this.repoComanadas.listarActivasPorPunto(entrada.puntoDeVentaId);

    return ok({
      comandas: comandas.map((c) => ({
        comandaId: c.id.toString(),
        mesaId: c.mesaId.toString(),
        estado: c.estado,
        totalConIVA: c.totalConIVA.valor,
        cantidadLineas: c.lineasActivas.length,
        abiertaEn: c.abiertaEn.toISOString(),
      })),
    });
  }
}
