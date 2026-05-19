import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccion,
  OrdenDeProduccionId,
  ProductVariantIdRef,
  RecipeIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
  CantidadAProducirInvalidaError,
  IdInvalidoError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

export interface EntradaCrearOrden {
  readonly varianteId: string;
  readonly recetaId: string;
  readonly plantaCentralId: string;
  readonly cantidadAProducir: number;
  readonly creadaPor: string;
}

export interface SalidaCrearOrden {
  readonly ordenId: string;
}

type ErrorCrearOrden = CantidadAProducirInvalidaError | IdInvalidoError;

/**
 * Crea una OrdenDeProduccion en estado PLANIFICADA.
 * El BOM se calcula en un paso posterior (`CalcularBOMYReservar`).
 */
export class CrearOrdenDeProduccion {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

  async execute(
    entrada: EntradaCrearOrden,
    correlacionId: string,
  ): Promise<Result<SalidaCrearOrden, ErrorCrearOrden>> {
    const varianteIdRes = ProductVariantIdRef.of(entrada.varianteId);
    if (!varianteIdRes.ok) return err(varianteIdRes.error);

    const recetaIdRes = RecipeIdRef.of(entrada.recetaId);
    if (!recetaIdRes.ok) return err(recetaIdRes.error);

    const plantaIdRes = BusinessUnitIdRef.of(entrada.plantaCentralId);
    if (!plantaIdRes.ok) return err(plantaIdRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.creadaPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const ordenRes = OrdenDeProduccion.crear(
      {
        id: OrdenDeProduccionId.nuevo(),
        varianteId: varianteIdRes.value,
        recetaId: recetaIdRes.value,
        plantaCentralId: plantaIdRes.value,
        cantidadAProducir: entrada.cantidadAProducir,
        creadaPor: usuarioIdRes.value,
        ahora: FechaHora.ahora(),
      },
      correlacionId,
    );

    if (!ordenRes.ok) return err(ordenRes.error);

    await this.reposOrdenes.save(ordenRes.value, correlacionId);
    return ok({ ordenId: ordenRes.value.id.toString() });
  }
}
