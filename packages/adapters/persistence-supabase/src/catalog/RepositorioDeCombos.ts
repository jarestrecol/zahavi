import type { Kysely } from 'kysely';
import type { IComboRepository } from '@zahavi/ports';
import type { Combo, ComboId } from '@zahavi/domain-catalog';
import { FechaHora } from '@zahavi/domain-catalog';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import { rowToCombo } from './mappers.js';

export class RepositorioDeCombos implements IComboRepository {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  private async fetchItems(comboId: string) {
    return this.db
      .selectFrom('catalog.combo_items')
      .selectAll()
      .where('combo_id', '=', comboId)
      .execute();
  }

  async save(combo: Combo, _correlacionId: string): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const comboRow = {
          id: combo.id.toString(),
          nombre: combo.nombre.toString(),
          descripcion: combo.descripcion,
          imagen_url: combo.imagenUrl,
          precio_cop: combo.precio.toCop(),
          estado: combo.estado,
          vigencia_desde: combo.vigenciaDesde?.toISOString() ?? null,
          vigencia_hasta: combo.vigenciaHasta?.toISOString() ?? null,
          creado_en: combo.creadoEn.toISOString(),
          actualizado_en: new Date().toISOString(),
        };

        await trx
          .insertInto('catalog.combos')
          .values(comboRow)
          .onConflict((oc) => oc.column('id').doUpdateSet(comboRow))
          .execute();

        await trx
          .deleteFrom('catalog.combo_items')
          .where('combo_id', '=', combo.id.toString())
          .execute();

        if (combo.items.length > 0) {
          const itemRows = combo.items.map((item) => ({
            id: item.id.toString(),
            combo_id: combo.id.toString(),
            product_variant_id: item.productVariantId.toString(),
            cantidad_valor: item.cantidad.valor(),
            unidad: item.cantidad.unidad(),
          }));
          await trx.insertInto('catalog.combo_items').values(itemRows).execute();
        }
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(comboId: ComboId): Promise<Combo | null> {
    try {
      const cRow = await this.db
        .selectFrom('catalog.combos')
        .selectAll()
        .where('id', '=', comboId.toString())
        .executeTakeFirst();

      if (!cRow) return null;
      const items = await this.fetchItems(cRow.id);
      return rowToCombo(cRow, items);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getActiveAndVigenteAt(ahora: FechaHora): Promise<ReadonlyArray<Combo>> {
    try {
      const tsDate = new Date(ahora.toTimestamp());
      const cRows = await this.db
        .selectFrom('catalog.combos')
        .selectAll()
        .where('estado', '=', 'activo')
        .where((eb) =>
          eb.or([eb('vigencia_desde', 'is', null), eb('vigencia_desde', '<=', tsDate)]),
        )
        .where((eb) =>
          eb.or([eb('vigencia_hasta', 'is', null), eb('vigencia_hasta', '>=', tsDate)]),
        )
        .execute();

      const combos: Combo[] = [];
      for (const cRow of cRows) {
        const items = await this.fetchItems(cRow.id);
        combos.push(rowToCombo(cRow, items));
      }
      return combos;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getActive(): Promise<ReadonlyArray<Combo>> {
    try {
      const cRows = await this.db
        .selectFrom('catalog.combos')
        .selectAll()
        .where('estado', '=', 'activo')
        .execute();

      const combos: Combo[] = [];
      for (const cRow of cRows) {
        const items = await this.fetchItems(cRow.id);
        combos.push(rowToCombo(cRow, items));
      }
      return combos;
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(combo: Combo, correlacionId: string): Promise<void> {
    return this.save(combo, correlacionId);
  }

  async list(): Promise<ReadonlyArray<Combo>> {
    try {
      const cRows = await this.db.selectFrom('catalog.combos').selectAll().execute();

      const combos: Combo[] = [];
      for (const cRow of cRows) {
        const items = await this.fetchItems(cRow.id);
        combos.push(rowToCombo(cRow, items));
      }
      return combos;
    } catch (e) {
      throw new Err(e);
    }
  }
}
