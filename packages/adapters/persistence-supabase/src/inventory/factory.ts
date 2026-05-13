import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  IIngredientRepository,
  IStockItemRepository,
  IStockMovementRepository,
  IStockAlertRepository,
  ISupplierRepository,
  IPublicadorDeDomainEventsInventory,
} from '@zahavi/ports';
import type { InventoryDatabase } from './schema.js';
import { RepositorioDeIngredientes } from './RepositorioDeIngredientes.js';
import { RepositorioDeStockItems } from './RepositorioDeStockItems.js';
import { RepositorioDeMovimientos } from './RepositorioDeMovimientos.js';
import { RepositorioDeAlertas } from './RepositorioDeAlertas.js';
import { RepositorioDeProveedores } from './RepositorioDeProveedores.js';
import { PublicadorDeEventosInventoryNoop } from './PublicadorDeEventosInventoryNoop.js';

export interface InventoryAdapters {
  repositorioDeIngredientes: IIngredientRepository;
  repositorioDeStockItems: IStockItemRepository;
  repositorioDeMovimientos: IStockMovementRepository;
  repositorioDeAlertas: IStockAlertRepository;
  repositorioDeProveedores: ISupplierRepository;
  publicadorDeEventos: IPublicadorDeDomainEventsInventory;
}

export function createInventoryAdapters(databaseUrl: string): InventoryAdapters {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : undefined,
  });
  const db = new Kysely<InventoryDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeIngredientes: new RepositorioDeIngredientes(db),
    repositorioDeStockItems: new RepositorioDeStockItems(db),
    repositorioDeMovimientos: new RepositorioDeMovimientos(db),
    repositorioDeAlertas: new RepositorioDeAlertas(db),
    repositorioDeProveedores: new RepositorioDeProveedores(db),
    publicadorDeEventos: new PublicadorDeEventosInventoryNoop(),
  };
}
