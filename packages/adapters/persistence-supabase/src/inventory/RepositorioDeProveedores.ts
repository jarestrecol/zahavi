import type { Kysely } from 'kysely';
import type { ISupplierRepository } from '@zahavi/ports';
import type { Supplier, SupplierId } from '@zahavi/domain-inventory';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { InventoryDatabase } from './schema.js';
import { rowToSupplier } from './mappers.js';

export class RepositorioDeProveedores implements ISupplierRepository {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async save(supplier: Supplier, _correlacionId: string): Promise<void> {
    try {
      await this.db
        .insertInto('inventory.suppliers')
        .values({
          id: supplier.id.toString(),
          nombre: supplier.nombre,
          contacto: supplier.contacto,
          notas: supplier.notas,
          estado: supplier.estado,
          creado_en: supplier.creadoEn.toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            nombre: supplier.nombre,
            contacto: supplier.contacto,
            notas: supplier.notas,
            estado: supplier.estado,
            actualizado_en: new Date().toISOString(),
          }),
        )
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(supplierId: SupplierId): Promise<Supplier | null> {
    try {
      const row = await this.db
        .selectFrom('inventory.suppliers')
        .selectAll()
        .where('id', '=', supplierId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToSupplier(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async list(): Promise<ReadonlyArray<Supplier>> {
    try {
      const rows = await this.db
        .selectFrom('inventory.suppliers')
        .selectAll()
        .orderBy('nombre')
        .execute();
      return rows.map(rowToSupplier);
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(supplier: Supplier, correlacionId: string): Promise<void> {
    return this.save(supplier, correlacionId);
  }
}
