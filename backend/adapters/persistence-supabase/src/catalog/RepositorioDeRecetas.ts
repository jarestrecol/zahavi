import type { Kysely } from 'kysely';
import type { IRecipeRepository } from '@zahavi/ports';
import type { Recipe, RecipeId, ProductVariantId, ProductId } from '@zahavi/domain-catalog';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import { rowToRecipe } from './mappers.js';

export class RepositorioDeRecetas implements IRecipeRepository {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  private async fetchLines(recipeId: string) {
    return this.db
      .selectFrom('catalog.recipe_lines')
      .selectAll()
      .where('recipe_id', '=', recipeId)
      .execute();
  }

  async save(recipe: Recipe, _correlacionId: string): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const recipeRow = {
          id: recipe.id.toString(),
          variante_id: recipe.varianteId.toString(),
          version: recipe.version,
          actualizada_en: recipe.actualizadaEn.toISOString(),
        };

        await trx
          .insertInto('catalog.recipes')
          .values(recipeRow)
          .onConflict((oc) => oc.column('id').doUpdateSet(recipeRow))
          .execute();

        // Eliminar líneas previas y re-insertar
        await trx
          .deleteFrom('catalog.recipe_lines')
          .where('recipe_id', '=', recipe.id.toString())
          .execute();

        if (recipe.lineas.length > 0) {
          const lineRows = recipe.lineas.map((l) => ({
            id: l.id.toString(),
            recipe_id: recipe.id.toString(),
            ingredient_id: l.ingredientId.toString(),
            cantidad_valor: l.cantidad.valor(),
            unidad: l.cantidad.unidad(),
            es_empaque: l.esEmpaque,
            creado_en: new Date().toISOString(),
          }));
          await trx.insertInto('catalog.recipe_lines').values(lineRows).execute();
        }
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(recipeId: RecipeId): Promise<Recipe | null> {
    try {
      const rRow = await this.db
        .selectFrom('catalog.recipes')
        .selectAll()
        .where('id', '=', recipeId.toString())
        .executeTakeFirst();

      if (!rRow) return null;
      const lines = await this.fetchLines(rRow.id);
      return rowToRecipe(rRow, lines);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getByVariantId(varianteId: ProductVariantId): Promise<Recipe | null> {
    try {
      const rRow = await this.db
        .selectFrom('catalog.recipes')
        .selectAll()
        .where('variante_id', '=', varianteId.toString())
        .executeTakeFirst();

      if (!rRow) return null;
      const lines = await this.fetchLines(rRow.id);
      return rowToRecipe(rRow, lines);
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(recipe: Recipe, correlacionId: string): Promise<void> {
    return this.save(recipe, correlacionId);
  }

  async getByProductId(productId: ProductId): Promise<ReadonlyArray<Recipe>> {
    try {
      // Join: recipe → variant → product
      const rows = await this.db
        .selectFrom('catalog.recipes as r')
        .innerJoin('catalog.product_variants as v', 'v.id', 'r.variante_id')
        .where('v.product_id', '=', productId.toString())
        .selectAll('r')
        .execute();

      const recipes: Recipe[] = [];
      for (const rRow of rows) {
        const lines = await this.fetchLines(rRow.id);
        recipes.push(rowToRecipe(rRow, lines));
      }
      return recipes;
    } catch (e) {
      throw new Err(e);
    }
  }
}
