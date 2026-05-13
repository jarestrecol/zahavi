import type { Kysely } from 'kysely';
import type { ICategoryRepository } from '@zahavi/ports';
import type { Category, CategoryId } from '@zahavi/domain-catalog';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import { rowToCategory, categoryToRow } from './mappers.js';

export class RepositorioDeCategorias implements ICategoryRepository {
  constructor(private readonly db: Kysely<CatalogDatabase>) {}

  async save(category: Category, _correlacionId: string): Promise<void> {
    try {
      const row = categoryToRow(category);
      await this.db
        .insertInto('catalog.categories')
        .values(row)
        .onConflict((oc) => oc.column('id').doUpdateSet(row))
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async getById(categoryId: CategoryId): Promise<Category | null> {
    try {
      const row = await this.db
        .selectFrom('catalog.categories')
        .selectAll()
        .where('id', '=', categoryId.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToCategory(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getRoots(): Promise<ReadonlyArray<Category>> {
    try {
      const rows = await this.db
        .selectFrom('catalog.categories')
        .selectAll()
        .where('padre_id', 'is', null)
        .orderBy('orden')
        .execute();
      return rows.map(rowToCategory);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getByParentId(parentId: CategoryId): Promise<ReadonlyArray<Category>> {
    try {
      const rows = await this.db
        .selectFrom('catalog.categories')
        .selectAll()
        .where('padre_id', '=', parentId.toString())
        .orderBy('orden')
        .execute();
      return rows.map(rowToCategory);
    } catch (e) {
      throw new Err(e);
    }
  }

  async getDepth(categoryId: CategoryId): Promise<number> {
    try {
      // Recorrido iterativo hacia arriba por padre_id
      let depth = 0;
      let currentId: string | null = categoryId.toString();

      while (currentId !== null) {
        const row = await this.db
          .selectFrom('catalog.categories')
          .select(['id', 'padre_id'])
          .where('id', '=', currentId)
          .executeTakeFirst();

        if (!row) return depth === 0 ? -1 : depth - 1;
        currentId = row.padre_id;
        if (currentId !== null) depth++;
      }
      return depth;
    } catch (e) {
      throw new Err(e);
    }
  }

  async getAncestors(categoryId: CategoryId): Promise<ReadonlyArray<Category>> {
    try {
      const ancestors: Category[] = [];
      let currentId: string | null = categoryId.toString();

      // Buscar la categoría actual primero para verificar que existe
      const self = await this.db
        .selectFrom('catalog.categories')
        .selectAll()
        .where('id', '=', currentId)
        .executeTakeFirst();

      if (!self) return [];

      currentId = self.padre_id;

      while (currentId !== null) {
        const row = await this.db
          .selectFrom('catalog.categories')
          .selectAll()
          .where('id', '=', currentId)
          .executeTakeFirst();

        if (!row) break;
        ancestors.unshift(rowToCategory(row));
        currentId = row.padre_id;
      }
      return ancestors;
    } catch (e) {
      throw new Err(e);
    }
  }

  async hasActiveProducts(categoryId: CategoryId): Promise<boolean> {
    try {
      const row = await this.db
        .selectFrom('catalog.products')
        .select('id')
        .where('categoria_id', '=', categoryId.toString())
        .where('estado', '=', 'activo')
        .limit(1)
        .executeTakeFirst();
      return row !== undefined;
    } catch (e) {
      throw new Err(e);
    }
  }

  async update(category: Category, correlacionId: string): Promise<void> {
    return this.save(category, correlacionId);
  }

  async list(): Promise<ReadonlyArray<Category>> {
    try {
      const rows = await this.db
        .selectFrom('catalog.categories')
        .selectAll()
        .orderBy('orden')
        .execute();
      return rows.map(rowToCategory);
    } catch (e) {
      throw new Err(e);
    }
  }
}
