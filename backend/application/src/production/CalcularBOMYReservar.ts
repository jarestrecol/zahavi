import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccionId,
  LineaDeBOM,
  LineaDeBOMId,
  IngredientIdRef,
  Cantidad,
  IdInvalidoError,
  BOMVacioError,
  BOMYaCalculadoError,
  LineaDeBOMDuplicadaError,
  IngredienteDuplicadoEnBOMError,
  BOMNoCalculadoError,
  TransicionDeEstadoInvalidaError,
  CantidadInvalidaError,
  OrdenNoEncontradaError,
  RecetaSinLineasError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository, IConsultorDeRecetaDeProduccion } from '@zahavi/ports';

export interface EntradaCalcularBOM {
  readonly ordenId: string;
}

export interface SalidaCalcularBOM {
  readonly ordenId: string;
  readonly estado: string;
  readonly lineasBOM: number;
}

type ErrorCalcularBOM =
  | IdInvalidoError
  | BOMVacioError
  | BOMYaCalculadoError
  | LineaDeBOMDuplicadaError
  | IngredienteDuplicadoEnBOMError
  | BOMNoCalculadoError
  | TransicionDeEstadoInvalidaError
  | CantidadInvalidaError
  | OrdenNoEncontradaError
  | RecetaSinLineasError;

/**
 * Obtiene la receta de Catalog vía ACL, escala las cantidades por `cantidadAProducir`,
 * calcula el BOM en la orden y la transiciona a RESERVADA.
 */
export class CalcularBOMYReservar {
  constructor(
    private readonly reposOrdenes: IOrdenDeProduccionRepository,
    private readonly consultorReceta: IConsultorDeRecetaDeProduccion,
  ) {}

  async execute(
    entrada: EntradaCalcularBOM,
    correlacionId: string,
  ): Promise<Result<SalidaCalcularBOM, ErrorCalcularBOM>> {
    const idRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!idRes.ok) return err(idRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(idRes.value);
    if (!orden) {
      return err(new OrdenNoEncontradaError(entrada.ordenId));
    }

    // Consulta ACL: obtener líneas de receta desde Catalog
    const lineasReceta = await this.consultorReceta.obtenerLineasDeReceta(
      orden.recetaId.toString(),
    );

    if (lineasReceta.length === 0) {
      return err(new RecetaSinLineasError(orden.recetaId.toString()));
    }

    // Construir líneas de BOM escaladas por cantidadAProducir
    const lineasBOM: LineaDeBOM[] = [];
    for (const lr of lineasReceta) {
      const ingIdRes = IngredientIdRef.of(lr.ingredientId);
      if (!ingIdRes.ok) return err(ingIdRes.error);

      const cantRes = Cantidad.de(lr.cantidadPorUnidad * orden.cantidadAProducir, lr.unidad);
      if (!cantRes.ok) return err(cantRes.error);

      lineasBOM.push(
        LineaDeBOM.crear({
          id: LineaDeBOMId.nuevo(),
          ingredientId: ingIdRes.value,
          cantidadRequerida: cantRes.value,
        }),
      );
    }

    const ahora = FechaHora.ahora();

    // Paso 1: calcular BOM
    const conBOMRes = orden.calcularBOM(lineasBOM, ahora, correlacionId);
    if (!conBOMRes.ok) return err(conBOMRes.error);

    // Paso 2: reservar ingredientes (PLANIFICADA → RESERVADA)
    const reservadaRes = conBOMRes.value.reservarIngredientes(ahora, correlacionId + '-reservar');
    if (!reservadaRes.ok) return err(reservadaRes.error);

    await this.reposOrdenes.update(reservadaRes.value, correlacionId);

    return ok({
      ordenId: entrada.ordenId,
      estado: reservadaRes.value.estado,
      lineasBOM: reservadaRes.value.bom.length,
    });
  }
}
