import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  IdInvalidoError,
  TransicionDeComandaInvalidaError,
  ComandaNoEncontradaError,
} from '@zahavi/domain-sales';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaMarcarEnPreparacion {
  readonly comandaId: string;
}

export interface SalidaMarcarEnPreparacion {
  readonly estado: string;
}

type ErrorMarcarEnPreparacion =
  | IdInvalidoError
  | TransicionDeComandaInvalidaError
  | ComandaNoEncontradaError;

/** Marca la comanda en preparación en cocina (ENVIADA → EN_PREPARACION). */
export class MarcarComandaEnPreparacion {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaMarcarEnPreparacion,
    correlacionId: string,
  ): Promise<Result<SalidaMarcarEnPreparacion, ErrorMarcarEnPreparacion>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }

    const res = comanda.marcarEnPreparacion(FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.repoComanadas.update(res.value, correlacionId);
    return ok({ estado: res.value.estado });
  }
}
