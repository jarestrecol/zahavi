import type { Kysely } from 'kysely';
import type { IConsultorDeCostosDeIngredientes } from '@zahavi/ports';
import type { IngredientId } from '@zahavi/domain-catalog';
import { Money } from '@zahavi/domain-catalog';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { InventoryDatabase } from '../inventory/schema.js';

export class ConsultorDeCostosDeIngredientesSupabase implements IConsultorDeCostosDeIngredientes {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async obtenerCostosParaReceta(
    ingredientIds: ReadonlyArray<IngredientId>,
  ): Promise<ReadonlyMap<string, Money>> {
    if (ingredientIds.length === 0) return new Map();
    try {
      const ids = ingredientIds.map((id) => id.toString());
      const rows = await this.db
        .selectFrom('inventory.ingredients')
        .select(['id', 'costo_unitario_actual'])
        .where('id', 'in', ids)
        .execute();

      const costos = new Map<string, Money>();
      for (const row of rows) {
        const moneyResult = Money.deCop(Number(row.costo_unitario_actual));
        if (moneyResult.ok) costos.set(row.id, moneyResult.value);
      }
      return costos;
    } catch (e) {
      throw new Err(e);
    }
  }
}
