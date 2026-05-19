import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  MesaId,
  ComandaId,
  BusinessUnitIdRef,
  NombreMesa,
  IdInvalidoError,
  NombreMesaInvalidoError,
} from '@zahavi/domain-sales';
import type { IMesaRepository } from '@zahavi/ports';

export interface EntradaAbrirMesaAdHoc {
  readonly nombre: string;
  readonly puntoDeVentaId: string;
}

export interface SalidaAbrirMesaAdHoc {
  readonly mesaId: string;
  /** La comanda activa ya está asignada y lista para recibir líneas. */
  readonly comandaActivaId: string;
}

type ErrorAbrirMesaAdHoc = IdInvalidoError | NombreMesaInvalidoError;

/**
 * Crea una mesa ad-hoc (sin número fijo) y la ocupa de inmediato.
 * Caso de uso típico: mostrador, pedido para llevar, entrega a domicilio.
 */
export class AbrirMesaAdHoc {
  constructor(private readonly repoMesas: IMesaRepository) {}

  async execute(
    entrada: EntradaAbrirMesaAdHoc,
    correlacionId: string,
  ): Promise<Result<SalidaAbrirMesaAdHoc, ErrorAbrirMesaAdHoc>> {
    const nombreRes = NombreMesa.of(entrada.nombre);
    if (!nombreRes.ok) return err(nombreRes.error);

    const puntoRes = BusinessUnitIdRef.of(entrada.puntoDeVentaId);
    if (!puntoRes.ok) return err(puntoRes.error);

    const comandaId = ComandaId.nuevo();
    const mesa = Mesa.abrirAdHoc(
      {
        id: MesaId.nuevo(),
        nombre: nombreRes.value,
        puntoDeVentaId: puntoRes.value,
        comandaId,
        ahora: FechaHora.ahora(),
      },
      correlacionId,
    );

    await this.repoMesas.save(mesa, correlacionId);
    return ok({ mesaId: mesa.id.toString(), comandaActivaId: comandaId.toString() });
  }
}
