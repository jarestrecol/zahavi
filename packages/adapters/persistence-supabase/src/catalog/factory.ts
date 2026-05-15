import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  ICategoryRepository,
  IProductRepository,
  IRecipeRepository,
  IComboRepository,
  IPublicadorDeDomainEventsCatalog,
  IConsultorDeCostosDeIngredientes,
} from '@zahavi/ports';
import type { CatalogDatabase } from './schema.js';
import type { InventoryDatabase } from '../inventory/schema.js';
import { RepositorioDeCategorias } from './RepositorioDeCategorias.js';
import { RepositorioDeProductos } from './RepositorioDeProductos.js';
import { RepositorioDeRecetas } from './RepositorioDeRecetas.js';
import { RepositorioDeCombos } from './RepositorioDeCombos.js';
import { PublicadorDeEventosCatalogNoop } from './PublicadorDeEventosCatalogNoop.js';
import { ConsultorDeCostosDeIngredientesSupabase } from './ConsultorDeCostosDeIngredientesSupabase.js';

export interface CatalogAdapters {
  repositorioDeCategorias: ICategoryRepository;
  repositorioDeProductos: IProductRepository;
  repositorioDeRecetas: IRecipeRepository;
  repositorioDeCombos: IComboRepository;
  consultorDeCostos: IConsultorDeCostosDeIngredientes;
  publicadorDeEventos: IPublicadorDeDomainEventsCatalog;
}

export function createCatalogAdapters(pool: Pool): CatalogAdapters {
  // Dos instancias Kysely tipadas distintas comparten el mismo Pool subyacente.
  // CatalogDatabase: tablas catalog.*
  // InventoryDatabase: solo se usa para leer inventory.ingredients (ACL del escandallo).
  const catalogDb = new Kysely<CatalogDatabase>({ dialect: new PostgresDialect({ pool }) });
  const inventoryDb = new Kysely<InventoryDatabase>({ dialect: new PostgresDialect({ pool }) });

  return {
    repositorioDeCategorias: new RepositorioDeCategorias(catalogDb),
    repositorioDeProductos: new RepositorioDeProductos(catalogDb),
    repositorioDeRecetas: new RepositorioDeRecetas(catalogDb),
    repositorioDeCombos: new RepositorioDeCombos(catalogDb),
    consultorDeCostos: new ConsultorDeCostosDeIngredientesSupabase(inventoryDb),
    publicadorDeEventos: new PublicadorDeEventosCatalogNoop(),
  };
}
