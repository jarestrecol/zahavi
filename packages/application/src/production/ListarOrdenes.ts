import type { EstadoDeOrdenDeProduccion } from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

export interface EntradaListarOrdenes {
  readonly plantaCentralId: string;
  readonly estado?: EstadoDeOrdenDeProduccion;
}

export interface ResumenOrden {
  readonly ordenId: string;
  readonly varianteId: string;
  readonly recetaId: string;
  readonly estado: string;
  readonly cantidadAProducir: number;
  readonly creadaEn: string;
}

export interface SalidaListarOrdenes {
  readonly ordenes: ReadonlyArray<ResumenOrden>;
}

export class ListarOrdenes {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

  async execute(entrada: EntradaListarOrdenes): Promise<SalidaListarOrdenes> {
    const ordenes = entrada.estado
      ? await this.reposOrdenes.listarPorEstado(entrada.estado)
      : await this.reposOrdenes.listarPorPlanta(entrada.plantaCentralId);

    return {
      ordenes: ordenes.map((o) => ({
        ordenId: o.id.toString(),
        varianteId: o.varianteId.toString(),
        recetaId: o.recetaId.toString(),
        estado: o.estado,
        cantidadAProducir: o.cantidadAProducir,
        creadaEn: o.creadaEn.toISOString(),
      })),
    };
  }
}
