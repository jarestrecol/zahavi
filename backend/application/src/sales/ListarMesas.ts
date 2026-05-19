import { type Result, ok } from '@zahavi/domain-shared-kernel';
import { EstadoDeMesa, IdInvalidoError } from '@zahavi/domain-sales';
import type { IMesaRepository, IComandaRepository } from '@zahavi/ports';

export interface EntradaListarMesas {
  readonly puntoDeVentaId: string;
  readonly estado?: EstadoDeMesa;
}

export interface ResumenComandaActiva {
  readonly totalConIVA: number;
  readonly numLineas: number;
}

export interface ResumenMesa {
  readonly mesaId: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly estado: string;
  readonly comandaActivaId: string | null;
  readonly resumenComanda: ResumenComandaActiva | null;
}

export interface SalidaListarMesas {
  readonly mesas: ReadonlyArray<ResumenMesa>;
}

type ErrorListarMesas = IdInvalidoError;

/** Lista las mesas de un punto de venta con el resumen de la comanda activa si la hay. */
export class ListarMesas {
  constructor(
    private readonly repoMesas: IMesaRepository,
    private readonly repoComandas: IComandaRepository,
  ) {}

  async execute(
    entrada: EntradaListarMesas,
    _correlacionId: string,
  ): Promise<Result<SalidaListarMesas, ErrorListarMesas>> {
    const [mesas, comandasActivas] = await Promise.all([
      entrada.estado
        ? this.repoMesas.listarPorEstado(entrada.puntoDeVentaId, entrada.estado)
        : this.repoMesas.listarPorPunto(entrada.puntoDeVentaId),
      this.repoComandas.listarActivasPorPunto(entrada.puntoDeVentaId),
    ]);

    const comandaMap = new Map(
      comandasActivas.map((c) => [
        c.id.toString(),
        { totalConIVA: c.totalConIVA.valor, numLineas: c.lineasActivas.length },
      ]),
    );

    return ok({
      mesas: mesas.map((m) => {
        const cId = m.comandaActivaId?.toString() ?? null;
        return {
          mesaId: m.id.toString(),
          nombre: m.nombre.toString(),
          tipo: m.tipo,
          estado: m.estado,
          comandaActivaId: cId,
          resumenComanda: cId ? (comandaMap.get(cId) ?? null) : null,
        };
      }),
    });
  }
}
