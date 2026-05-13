import type { Kysely } from 'kysely';
import type { IStockItemRepository } from '@zahavi/ports';
import type {
  StockItem,
  StockItemId,
  IngredientId,
  BusinessUnitId,
} from '@zahavi/domain-inventory';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { InventoryDatabase } from './schema.js';
import { rowToStockItem } from './mappers.js';

export class RepositorioDeStockItems implements IStockItemRepository {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async save(stockItem: StockItem, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('inventory.stock_items')
        .values({
          id: stockItem.id.toString(),
          ingredient_id: stockItem.ingredientId.toString(),
          business_unit_id: stockItem.businessUnitId.toString(),
          cantidad_disponible: stockItem.cantidadDisponible,
          unidad_nativa: stockItem.unidadNativa,
          costo_promedio_cop: stockItem.costoPromedioUnitario.toCop(),
          version: stockItem.version,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            cantidad_disponible: stockItem.cantidadDisponible,
            costo_promedio_cop: stockItem.costoPromedioUnitario.toCop(),
            version: stockItem.version,
            actualizado_en: new Date().toISOString(),
          }),
        )
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(stockItemId: StockItemId): Promise<StockItem | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.stock_items')
        .selectAll()
        .where('id', '=', stockItemId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToStockItem(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockItem | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.stock_items')
        .selectAll()
        .where('ingredient_id', '=', ingredientId.toString())
        .where('business_unit_id', '=', businessUnitId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToStockItem(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async listByBusinessUnit(businessUnitId: BusinessUnitId): Promise<ReadonlyArray<StockItem>> {
    try {
      const rows = await this.db
        .selectFrom('inventory.stock_items')
        .selectAll()
        .where('business_unit_id', '=', businessUnitId.toString())
        .execute();
      return rows.map(rowToStockItem);
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(stockItem: StockItem, correlacionId: string): Promise<void> {
    return this.save(stockItem, correlacionId);
  }
}
