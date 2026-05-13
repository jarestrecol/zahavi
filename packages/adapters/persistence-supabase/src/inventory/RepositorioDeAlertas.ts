import type { Kysely } from 'kysely';
import type { IStockAlertRepository } from '@zahavi/ports';
import type {
  StockAlert,
  StockAlertId,
  IngredientId,
  BusinessUnitId,
  EstadoDeAlerta,
} from '@zahavi/domain-inventory';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { InventoryDatabase } from './schema.js';
import { rowToAlert } from './mappers.js';

export class RepositorioDeAlertas implements IStockAlertRepository {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async save(alerta: StockAlert, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('inventory.stock_alerts')
        .values({
          id: alerta.id.toString(),
          ingredient_id: alerta.ingredientId.toString(),
          business_unit_id: alerta.businessUnitId.toString(),
          stock_al_momento: alerta.stockAlMomento,
          umbral_al_momento: alerta.umbralAlMomento,
          unidad: alerta.unidad,
          estado: alerta.estado,
          creada_en: alerta.creadaEn.toISOString(),
          cierre_en: alerta.cierreEn ? new Date(alerta.cierreEn.toTimestamp()).toISOString() : null,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            estado: alerta.estado,
            cierre_en: alerta.cierreEn
              ? new Date(alerta.cierreEn.toTimestamp()).toISOString()
              : null,
          }),
        )
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(alertaId: StockAlertId): Promise<StockAlert | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.stock_alerts')
        .selectAll()
        .where('id', '=', alertaId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToAlert(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getOpenByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockAlert | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.stock_alerts')
        .selectAll()
        .where('ingredient_id', '=', ingredientId.toString())
        .where('business_unit_id', '=', businessUnitId.toString())
        .where('estado', '=', 'abierta')
        .executeTakeFirst();
      return row !== undefined ? rowToAlert(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    estado?: EstadoDeAlerta,
  ): Promise<ReadonlyArray<StockAlert>> {
    try {
      let query = this.db
        .selectFrom('inventory.stock_alerts')
        .selectAll()
        .where('business_unit_id', '=', businessUnitId.toString())
        .orderBy('creada_en', 'desc');

      if (estado !== undefined) {
        query = query.where('estado', '=', estado);
      }

      const rows = await query.execute();
      return rows.map(rowToAlert);
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(alerta: StockAlert, correlacionId: string): Promise<void> {
    return this.save(alerta, correlacionId);
  }
}
