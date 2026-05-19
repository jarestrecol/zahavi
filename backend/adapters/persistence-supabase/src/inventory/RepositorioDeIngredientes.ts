import type { Kysely } from 'kysely';
import type { IIngredientRepository } from '@zahavi/ports';
import type { Ingredient, IngredientId } from '@zahavi/domain-inventory';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { InventoryDatabase } from './schema.js';
import { rowToIngredient } from './mappers.js';

export class RepositorioDeIngredientes implements IIngredientRepository {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async save(ingredient: Ingredient, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('inventory.ingredients')
        .values({
          id: ingredient.id.toString(),
          nombre: ingredient.nombre,
          unidad_nativa: ingredient.unidadNativa,
          costo_unitario_actual: ingredient.costoUnitarioActual.toCop(),
          umbral_de_alerta: ingredient.umbralDeAlerta,
          estado: ingredient.estado,
          creado_en: ingredient.creadoEn.toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            nombre: ingredient.nombre,
            unidad_nativa: ingredient.unidadNativa,
            costo_unitario_actual: ingredient.costoUnitarioActual.toCop(),
            umbral_de_alerta: ingredient.umbralDeAlerta,
            estado: ingredient.estado,
            actualizado_en: new Date().toISOString(),
          }),
        )
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(ingredientId: IngredientId): Promise<Ingredient | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.ingredients')
        .selectAll()
        .where('id', '=', ingredientId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToIngredient(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async list(): Promise<ReadonlyArray<Ingredient>> {
    try {
      const rows = await this.db
        .selectFrom('inventory.ingredients')
        .selectAll()
        .orderBy('nombre')
        .execute();
      return rows.map(rowToIngredient);
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(ingredient: Ingredient, correlacionId: string): Promise<void> {
    return this.save(ingredient, correlacionId);
  }
}
