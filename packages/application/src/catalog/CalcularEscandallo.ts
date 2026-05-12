import {
  type Result,
  ok,
  err,
  ProductId,
  ProductVariantId,
  type IdInvalidoError,
  type VarianteNoEncontradaError,
  type RecetaNoCorrespondeAVarianteError,
  type CostoIngredienteNoDisponibleError,
  type CostoCeroSospechosoError,
  type MoneyInvalidoError,
  ProductoNoEncontradoError,
  RecetaNoEncontradaError,
  RolNoAutorizadoCatalogError,
} from '@zahavi/domain-catalog';
import type {
  IProductRepository,
  IRecipeRepository,
  IConsultorDeCostosDeIngredientes,
} from '@zahavi/ports';

export interface EntradaCalcularEscandallo {
  productoId: string;
  varianteId: string;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaCalcularEscandallo {
  costoUnitarioCop: number;
  precioVentaCop: number;
  margenMontoCop: number;
  margenPorcentaje: number;
}

type ErrorCalcularEscandallo =
  | RolNoAutorizadoCatalogError
  | IdInvalidoError
  | ProductoNoEncontradoError
  | VarianteNoEncontradaError
  | RecetaNoEncontradaError
  | RecetaNoCorrespondeAVarianteError
  | CostoIngredienteNoDisponibleError
  | CostoCeroSospechosoError
  | MoneyInvalidoError;

export class CalcularEscandallo {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly recipeRepo: IRecipeRepository,
    private readonly consultorCostos: IConsultorDeCostosDeIngredientes,
  ) {}

  async execute(
    entrada: EntradaCalcularEscandallo,
  ): Promise<Result<SalidaCalcularEscandallo, ErrorCalcularEscandallo>> {
    if (entrada.actorRol !== 'ADMIN' && entrada.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoCatalogError(entrada.actorRol, 'CalcularEscandallo'));
    }

    const productoIdRes = ProductId.of(entrada.productoId);
    if (!productoIdRes.ok) return productoIdRes;

    const varianteIdRes = ProductVariantId.of(entrada.varianteId);
    if (!varianteIdRes.ok) return varianteIdRes;

    const producto = await this.productRepo.getById(productoIdRes.value);
    if (!producto) return err(new ProductoNoEncontradoError(entrada.productoId));

    const variante = producto.variantes.find((v) => v.id.equals(varianteIdRes.value));
    if (!variante) return err(new ProductoNoEncontradoError(entrada.varianteId));

    if (variante.recetaId === null) {
      return err(new RecetaNoEncontradaError(entrada.varianteId));
    }

    const receta = await this.recipeRepo.getByVariantId(varianteIdRes.value);
    if (!receta) return err(new RecetaNoEncontradaError(entrada.varianteId));

    const ingredientIds = receta.ingredientIdsRequeridos();
    const costos = await this.consultorCostos.obtenerCostosParaReceta(ingredientIds);

    const margenRes = producto.calcularMargen(varianteIdRes.value, receta, costos);
    if (!margenRes.ok) return margenRes;
    const margen = margenRes.value;

    return ok({
      costoUnitarioCop: margen.costoUnitario.toCop(),
      precioVentaCop: margen.precioVenta.toCop(),
      margenMontoCop: margen.montoMargen.toCop(),
      margenPorcentaje: margen.porcentajeMargen,
    });
  }
}
