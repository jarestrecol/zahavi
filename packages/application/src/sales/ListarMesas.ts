import { type Result, ok } from '@zahavi/domain-shared-kernel';
import { EstadoDeMesa, IdInvalidoError } from '@zahavi/domain-sales';
import type { IMesaRepository } from '@zahavi/ports';

export interface EntradaListarMesas {
  readonly puntoDeVentaId: string;
  readonly estado?: EstadoDeMesa;
}

export interface ResumenMesa {
  readonly mesaId: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly estado: string;
  readonly comandaActivaId: string | null;
}

export interface SalidaListarMesas {
  readonly mesas: ReadonlyArray<ResumenMesa>;
}

type ErrorListarMesas = IdInvalidoError;

/** Lista las mesas de un punto de venta, opcionalmente filtradas por estado. */
export class ListarMesas {
  constructor(private readonly repoMesas: IMesaRepository) {}

  async execute(
    entrada: EntradaListarMesas,
    _correlacionId: string,
  ): Promise<Result<SalidaListarMesas, ErrorListarMesas>> {
    const mesas = entrada.estado
      ? await this.repoMesas.listarPorEstado(entrada.puntoDeVentaId, entrada.estado)
      : await this.repoMesas.listarPorPunto(entrada.puntoDeVentaId);

    return ok({
      mesas: mesas.map((m) => ({
        mesaId: m.id.toString(),
        nombre: m.nombre.toString(),
        tipo: m.tipo,
        estado: m.estado,
        comandaActivaId: m.comandaActivaId?.toString() ?? null,
      })),
    });
  }
}
