import type { Kysely } from 'kysely';
import type { IStockMovementRepository, StockMovementRecord } from '@zahavi/ports';
import type { StockMovementId, IngredientId, BusinessUnitId } from '@zahavi/domain-inventory';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { FechaHora } from '@zahavi/domain-shared-kernel';
import type { InventoryDatabase } from './schema.js';
import { rowToMovement } from './mappers.js';

export class RepositorioDeMovimientos implements IStockMovementRepository {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async save(record: StockMovementRecord, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('inventory.stock_movements')
        .values({
          id: record.id.toString(),
          ingredient_id: record.ingredientId.toString(),
          business_unit_id: record.businessUnitId.toString(),
          tipo_movimiento: record.tipo,
          cantidad: record.cantidad,
          unidad: record.unidad,
          costo_unitario: record.costoUnitario.toCop(),
          referencia: record.referencia,
          motivo: record.motivo,
          supplier_id: record.supplierId?.toString() ?? null,
          ocurrido_en: new Date(record.ocurridoEn.toTimestamp()).toISOString(),
          registrado_por: record.registradoPor,
        })
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(movimientoId: StockMovementId): Promise<StockMovementRecord | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.stock_movements')
        .selectAll()
        .where('id', '=', movimientoId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToMovement(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async listByIngredient(
    ingredientId: IngredientId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>> {
    try {
      let query = this.db
        .selectFrom('inventory.stock_movements')
        .selectAll()
        .where('ingredient_id', '=', ingredientId.toString())
        .orderBy('ocurrido_en', 'desc');

      if (desde !== undefined) {
        query = query.where('ocurrido_en', '>=', new Date(desde.toTimestamp()));
      }
      if (hasta !== undefined) {
        query = query.where('ocurrido_en', '<=', new Date(hasta.toTimestamp()));
      }

      const rows = await query.execute();
      return rows.map(rowToMovement);
    } catch (e) {
      throw new Err(e);
    }
  }

  async listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>> {
    try {
      let query = this.db
        .selectFrom('inventory.stock_movements')
        .selectAll()
        .where('business_unit_id', '=', businessUnitId.toString())
        .orderBy('ocurrido_en', 'desc');

      if (desde !== undefined) {
        query = query.where('ocurrido_en', '>=', new Date(desde.toTimestamp()));
      }
      if (hasta !== undefined) {
        query = query.where('ocurrido_en', '<=', new Date(hasta.toTimestamp()));
      }

      const rows = await query.execute();
      return rows.map(rowToMovement);
    } catch (e) {
      throw new Err(e);
    }
  }
}
