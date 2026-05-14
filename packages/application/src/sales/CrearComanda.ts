import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  Comanda,
  ComandaId,
  MesaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  IdInvalidoError,
  MesaYaOcupadaError,
  TransicionDeMesaInvalidaError,
  MesaNoEncontradaError,
} from '@zahavi/domain-sales';
import type { IMesaRepository, IComandaRepository } from '@zahavi/ports';

export interface EntradaCrearComanda {
  readonly mesaId: string;
  readonly puntoDeVentaId: string;
  readonly tomadaPor: string;
}

export interface SalidaCrearComanda {
  readonly comandaId: string;
  readonly mesaId: string;
}

type ErrorCrearComanda =
  | IdInvalidoError
  | MesaYaOcupadaError
  | TransicionDeMesaInvalidaError
  | MesaNoEncontradaError;

/**
 * Crea una comanda para una mesa y la ocupa.
 * La mesa debe existir y estar en estado LIBRE o RESERVADA.
 */
export class CrearComanda {
  constructor(
    private readonly repoMesas: IMesaRepository,
    private readonly repoComanadas: IComandaRepository,
  ) {}

  async execute(
    entrada: EntradaCrearComanda,
    correlacionId: string,
  ): Promise<Result<SalidaCrearComanda, ErrorCrearComanda>> {
    const mesaIdRes = MesaId.of(entrada.mesaId);
    if (!mesaIdRes.ok) return err(mesaIdRes.error);

    const puntoRes = BusinessUnitIdRef.of(entrada.puntoDeVentaId);
    if (!puntoRes.ok) return err(puntoRes.error);

    const meseroRes = UsuarioIdRef.of(entrada.tomadaPor);
    if (!meseroRes.ok) return err(meseroRes.error);

    const mesa: Mesa | null = await this.repoMesas.obtenerPorId(mesaIdRes.value);
    if (!mesa) {
      return err(new MesaNoEncontradaError(entrada.mesaId));
    }

    const ahora = FechaHora.ahora();
    const comandaId = ComandaId.nuevo();

    const mesaOcupadaRes = mesa.ocupar(comandaId, ahora, correlacionId);
    if (!mesaOcupadaRes.ok) return err(mesaOcupadaRes.error);

    const comanda = Comanda.crear(
      {
        id: comandaId,
        mesaId: mesaIdRes.value,
        puntoDeVentaId: puntoRes.value,
        tomadaPor: meseroRes.value,
        ahora,
      },
      correlacionId,
    );

    await Promise.all([
      this.repoMesas.update(mesaOcupadaRes.value, correlacionId),
      this.repoComanadas.save(comanda, correlacionId),
    ]);

    return ok({ comandaId: comandaId.toString(), mesaId: entrada.mesaId });
  }
}
