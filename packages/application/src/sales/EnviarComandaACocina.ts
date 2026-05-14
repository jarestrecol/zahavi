import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  IdInvalidoError,
  ComandaSinLineasError,
  TransicionDeComandaInvalidaError,
  ComandaNoEncontradaError,
} from '@zahavi/domain-sales';
import type { IComandaRepository } from '@zahavi/ports';

export interface EntradaEnviarComanda {
  readonly comandaId: string;
}

export interface SalidaEnviarComanda {
  readonly estado: string;
}

type ErrorEnviarComanda =
  | IdInvalidoError
  | ComandaSinLineasError
  | TransicionDeComandaInvalidaError
  | ComandaNoEncontradaError;

/** Envía la comanda a cocina (ABIERTA → ENVIADA). */
export class EnviarComandaACocina {
  constructor(private readonly repoComanadas: IComandaRepository) {}

  async execute(
    entrada: EntradaEnviarComanda,
    correlacionId: string,
  ): Promise<Result<SalidaEnviarComanda, ErrorEnviarComanda>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }

    const res = comanda.enviar(FechaHora.ahora(), correlacionId);
    if (!res.ok) return err(res.error);

    await this.repoComanadas.update(res.value, correlacionId);
    return ok({ estado: res.value.estado });
  }
}
