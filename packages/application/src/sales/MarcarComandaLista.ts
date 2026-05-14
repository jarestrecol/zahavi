import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  IdInvalidoError,
  TransicionDeComandaInvalidaError,
  ComandaNoEncontradaError,
} from '@zahavi/domain-sales';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaMarcarLista {
  readonly comandaId: string;
}

export interface SalidaMarcarLista {
  readonly estado: string;
}

type ErrorMarcarLista =
  | IdInvalidoError
  | TransicionDeComandaInvalidaError
  | ComandaNoEncontradaError;

/** Marca la comanda lista para servir (EN_PREPARACION → LISTA). */
export class MarcarComandaLista {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaMarcarLista,
    correlacionId: string,
  ): Promise<Result<SalidaMarcarLista, ErrorMarcarLista>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }

    const res = comanda.marcarLista(FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.repoComanadas.update(res.value, correlacionId);
    return ok({ estado: res.value.estado });
  }
}
