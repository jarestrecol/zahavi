import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  MesaId,
  BusinessUnitIdRef,
  NombreMesa,
  IdInvalidoError,
  NombreMesaInvalidoError,
} from '@zahavi/domain-sales';
import type { IMesaRepository } from '@zahavi/ports';

export interface EntradaConfigurarMesa {
  readonly nombre: string;
  readonly puntoDeVentaId: string;
}

export interface SalidaConfigurarMesa {
  readonly mesaId: string;
}

type ErrorConfigurarMesa = IdInvalidoError | NombreMesaInvalidoError;

/** Crea una mesa del catálogo (solo ADMIN). Nace en estado LIBRE. */
export class ConfigurarMesa {
  constructor(private readonly repoMesas: IMesaRepository) {}

  async execute(
    entrada: EntradaConfigurarMesa,
    correlacionId: string,
  ): Promise<Result<SalidaConfigurarMesa, ErrorConfigurarMesa>> {
    const nombreRes = NombreMesa.of(entrada.nombre);
    if (!nombreRes.ok) return err(nombreRes.error);

    const puntoRes = BusinessUnitIdRef.of(entrada.puntoDeVentaId);
    if (!puntoRes.ok) return err(puntoRes.error);

    const mesa = Mesa.configurar(
      {
        id: MesaId.nuevo(),
        nombre: nombreRes.value,
        puntoDeVentaId: puntoRes.value,
        ahora: FechaHora.ahora(),
      },
      correlacionId,
    );

    await this.repoMesas.save(mesa, correlacionId);
    return ok({ mesaId: mesa.id.toString() });
  }
}
