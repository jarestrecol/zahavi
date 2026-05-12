import {
  type Result,
  ok,
  err,
  ProductId,
  ProductVariantId,
  RecipeId,
  RecipeLineId,
  IngredientId,
  Cantidad,
  RecipeLine,
  Recipe,
  FechaHora,
  esUnidadValida,
  type IdInvalidoError,
  type CantidadInvalidaError,
  type RecetaSinLineasError,
  type LineaDeRecetaDuplicadaError,
  type IngredienteDuplicadoEnRecetaError,
  ProductoNoEncontradoError,
  VarianteNoEncontradaError,
  RecetaYaExisteError,
  RolNoAutorizadoCatalogError,
} from '@zahavi/domain-catalog';
import type {
  IProductRepository,
  IRecipeRepository,
  IPublicadorDeDomainEventsCatalog,
} from '@zahavi/ports';

export interface EntradaCrearReceta {
  varianteId: string;
  productoId: string;
  lineas: Array<{
    ingredientId: string;
    cantidadValor: number;
    unidad: string;
    esEmpaque: boolean;
  }>;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaCrearReceta {
  recetaId: string;
  varianteId: string;
  productoId: string;
  cantidadDeLineas: number;
}

type ErrorCrearReceta =
  | RolNoAutorizadoCatalogError
  | IdInvalidoError
  | CantidadInvalidaError
  | RecetaSinLineasError
  | LineaDeRecetaDuplicadaError
  | IngredienteDuplicadoEnRecetaError
  | ProductoNoEncontradoError
  | VarianteNoEncontradaError
  | RecetaYaExisteError;

export class UnidadInvalidaEnRecetaError extends Error {
  readonly code = 'CATALOG_UNIDAD_INVALIDA';
  constructor(unidad: string) {
    super(`Unidad inválida en línea de receta: "${unidad}"`);
    this.name = 'UnidadInvalidaEnRecetaError';
  }
}

export class CrearReceta {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly recipeRepo: IRecipeRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaCrearReceta,
  ): Promise<Result<SalidaCrearReceta, ErrorCrearReceta>> {
    if (entrada.actorRol !== 'ADMIN' && entrada.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoCatalogError(entrada.actorRol, 'CrearReceta'));
    }

    const productoIdRes = ProductId.of(entrada.productoId);
    if (!productoIdRes.ok) return productoIdRes;

    const varianteIdRes = ProductVariantId.of(entrada.varianteId);
    if (!varianteIdRes.ok) return varianteIdRes;

    const producto = await this.productRepo.getById(productoIdRes.value);
    if (!producto) return err(new ProductoNoEncontradoError(entrada.productoId));

    const variante = producto.variantes.find((v) => v.id.equals(varianteIdRes.value));
    if (!variante) return err(new VarianteNoEncontradaError(entrada.varianteId));

    if (variante.recetaId !== null) {
      return err(new RecetaYaExisteError(entrada.varianteId));
    }

    const lineas: RecipeLine[] = [];
    for (const lineaEntrada of entrada.lineas) {
      if (!esUnidadValida(lineaEntrada.unidad)) {
        return err(new RolNoAutorizadoCatalogError(lineaEntrada.unidad, 'unidad inválida'));
      }

      const lineaIdRes = RecipeLineId.of(crypto.randomUUID());
      if (!lineaIdRes.ok) return lineaIdRes;

      const ingRes = IngredientId.of(lineaEntrada.ingredientId);
      if (!ingRes.ok) return ingRes;

      const cantRes = Cantidad.de(lineaEntrada.cantidadValor, lineaEntrada.unidad);
      if (!cantRes.ok) return cantRes;

      lineas.push(
        RecipeLine.crear({
          id: lineaIdRes.value,
          ingredientId: ingRes.value,
          cantidad: cantRes.value,
          esEmpaque: lineaEntrada.esEmpaque,
        }),
      );
    }

    const recetaId = RecipeId.of(crypto.randomUUID());
    if (!recetaId.ok) return recetaId;

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const recetaRes = Recipe.crear(
      {
        id: recetaId.value,
        varianteId: varianteIdRes.value,
        lineas,
        ahora,
      },
      eventoId,
    );
    if (!recetaRes.ok) return recetaRes;
    const receta = recetaRes.value;

    const vinculadoRes = producto.vincularRecetaAVariante(
      varianteIdRes.value,
      recetaId.value,
      ahora,
      crypto.randomUUID(),
    );
    if (!vinculadoRes.ok) return vinculadoRes;
    const productoActualizado = vinculadoRes.value;

    await this.recipeRepo.save(receta, entrada.correlacionId);
    await this.productRepo.update(productoActualizado, entrada.correlacionId);

    for (const evento of receta.pullDomainEvents()) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }
    for (const evento of productoActualizado.pullDomainEvents()) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({
      recetaId: recetaId.value.toString(),
      varianteId: entrada.varianteId,
      productoId: entrada.productoId,
      cantidadDeLineas: lineas.length,
    });
  }
}
