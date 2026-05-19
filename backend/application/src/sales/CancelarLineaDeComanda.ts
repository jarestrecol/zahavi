import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  LineaDeComandaId,
  IdInvalidoError,
  ComandaNoModificableError,
  LineaNoEncontradaError,
  ComandaNoEncontradaError,
} from '@zahavi/domain-sales';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaCancelarLinea {
  readonly comandaId: string;
  readonly lineaId: string;
}

export interface SalidaCancelarLinea {
  readonly totalComandaConIVA: number;
}

type ErrorCancelarLinea =
  | IdInvalidoError
  | ComandaNoModificableError
  | LineaNoEncontradaError
  | ComandaNoEncontradaError;

export class CancelarLineaDeComanda {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaCancelarLinea,
    correlacionId: string,
  ): Promise<Result<SalidaCancelarLinea, ErrorCancelarLinea>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const lineaIdRes = LineaDeComandaId.of(entrada.lineaId);
    if (!lineaIdRes.ok) return err(lineaIdRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }

    const res = comanda.cancelarLinea(lineaIdRes.value, FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.repoComanadas.update(res.value, correlacionId);
    return ok({ totalComandaConIVA: res.value.totalConIVA.valor });
  }
}
