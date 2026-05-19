import type { Kysely } from 'kysely';
import type { IProductRepository } from '@zahavi/ports';
import type { Product, ProductId, CategoryId, NombreDeCatalogo } from '@zahavi/domain-catalog';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import { rowToProduct, productToRows } from './mappers.js';

export class RepositorioDeProductos implements IProductRepository {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  async save(product: Product, _correlacionId: string): Promise<void> {
    try {
      const { product: pRow, variants } = productToRows(product);

      await this.db.transaction().execute(async (trx) => {
        await trx
          .insertInto('catalog.products')
          .values(pRow)
          .onConflict((oc) => oc.column('id').doUpdateSet(pRow))
          .execute();

        if (variants.length > 0) {
          await trx
            .insertInto('catalog.product_variants')
            .values(variants)
            .onConflict((oc) =>
              oc.column('id').doUpdateSet((eb) => ({
                nombre: eb.ref('excluded.nombre'),
                precio_cop: eb.ref('excluded.precio_cop'),
                receta_id: eb.ref('excluded.receta_id'),
                actualizado_en: eb.ref('excluded.actualizado_en'),
              })),
            )
            .execute();
        }
      });
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(productId: ProductId): Promise<Product | null> {
    try {
      const pRow = await this.db
        .selectFrom('catalog.products')
        .selectAll()
        .where('id', '=', productId.toString())
        .executeTakeFirst();

      if (!pRow) return null;

      const vRows = await this.db
        .selectFrom('catalog.product_variants')
        .selectAll()
        .where('product_id', '=', productId.toString())
        .execute();

      return rowToProduct(pRow, vRows);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getByCategoryId(categoryId: CategoryId): Promise<ReadonlyArray<Product>> {
    try {
      const pRows = await this.db
        .selectFrom('catalog.products')
        .selectAll()
        .where('categoria_id', '=', categoryId.toString())
        .execute();

      const products: Product[] = [];
      for (const pRow of pRows) {
        const vRows = await this.db
          .selectFrom('catalog.product_variants')
          .selectAll()
          .where('product_id', '=', pRow.id)
          .execute();
        products.push(rowToProduct(pRow, vRows));
      }
      return products;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getByNameInCategory(
    nombre: NombreDeCatalogo,
    categoryId: CategoryId,
  ): Promise<Product | null> {
    try {
      const pRow = await this.db
        .selectFrom('catalog.products')
        .selectAll()
        .where('nombre', '=', nombre.toString())
        .where('categoria_id', '=', categoryId.toString())
        .executeTakeFirst();

      if (!pRow) return null;

      const vRows = await this.db
        .selectFrom('catalog.product_variants')
        .selectAll()
        .where('product_id', '=', pRow.id)
        .execute();

      return rowToProduct(pRow, vRows);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getActive(): Promise<ReadonlyArray<Product>> {
    try {
      const pRows = await this.db
        .selectFrom('catalog.products')
        .selectAll()
        .where('estado', '=', 'activo')
        .execute();

      const products: Product[] = [];
      for (const pRow of pRows) {
        const vRows = await this.db
          .selectFrom('catalog.product_variants')
          .selectAll()
          .where('product_id', '=', pRow.id)
          .execute();
        products.push(rowToProduct(pRow, vRows));
      }
      return products;
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(product: Product, correlacionId: string): Promise<void> {
    return this.save(product, correlacionId);
  }

  async list(): Promise<ReadonlyArray<Product>> {
    try {
      const pRows = await this.db.selectFrom('catalog.products').selectAll().execute();

      const products: Product[] = [];
      for (const pRow of pRows) {
        const vRows = await this.db
          .selectFrom('catalog.product_variants')
          .selectAll()
          .where('product_id', '=', pRow.id)
          .execute();
        products.push(rowToProduct(pRow, vRows));
      }
      return products;
    } catch (e) {
      throw new Err(e);
    }
  }
}
