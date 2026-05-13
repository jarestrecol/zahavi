import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  ICategoryRepository,
  IProductRepository,
  IRecipeRepository,
  IComboRepository,
  IPublicadorDeDomainEventsCatalog,
} from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import { RepositorioDeCategorias } from './RepositorioDeCategorias.js';
import { RepositorioDeProductos } from './RepositorioDeProductos.js';
import { RepositorioDeRecetas } from './RepositorioDeRecetas.js';
import { RepositorioDeCombos } from './RepositorioDeCombos.js';
import { PublicadorDeEventosCatalogNoop } from './PublicadorDeEventosCatalogNoop.js';

export interface CatalogAdapters {
  repositorioDeCategorias: ICategoryRepository;
  repositorioDeProductos: IProductRepository;
  repositorioDeRecetas: IRecipeRepository;
  repositorioDeCombos: IComboRepository;
  publicadorDeEventos: IPublicadorDeDomainEventsCatalog;
}

export function createCatalogAdapters(databaseUrl: string): CatalogAdapters {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : undefined,
  });
  const db = new Kysely<CatalogDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeCategorias: new RepositorioDeCategorias(db),
    repositorioDeProductos: new RepositorioDeProductos(db),
    repositorioDeRecetas: new RepositorioDeRecetas(db),
    repositorioDeCombos: new RepositorioDeCombos(db),
    publicadorDeEventos: new PublicadorDeEventosCatalogNoop(),
  };
}
