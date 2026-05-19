import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  IOrdenDeProduccionRepository,
  IDespachoRepository,
  IConsultorDeRecetaDeProduccion,
  IDescontadorDeInventario,
} from '@zahavi/ports';
import type { ProductionDatabase } from './schema.js';
import type { CatalogDatabase } from '../catalog/schema.js';
import type { InventoryDatabase } from '../inventory/schema.js';
import { RepositorioDeOrdenesSupabase } from './RepositorioDeOrdenesSupabase.js';
import { RepositorioDeDespachoSupabase } from './RepositorioDeDespachoSupabase.js';
import { ConsultorDeRecetaSupabase } from './ConsultorDeRecetaSupabase.js';
import { DescontadorDeInventarioSupabase } from './DescontadorDeInventarioSupabase.js';

export interface ProductionAdapters {
  repositorioDeOrdenes: IOrdenDeProduccionRepository;
  repositorioDeDespachos: IDespachoRepository;
  consultorDeReceta: IConsultorDeRecetaDeProduccion;
  descontadorDeInventario: IDescontadorDeInventario;
}

export function createProductionAdapters(pool: Pool): ProductionAdapters {
  const productionDb = new Kysely<ProductionDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  const catalogDb = new Kysely<CatalogDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  const inventoryDb = new Kysely<InventoryDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeOrdenes: new RepositorioDeOrdenesSupabase(productionDb),
    repositorioDeDespachos: new RepositorioDeDespachoSupabase(productionDb),
    consultorDeReceta: new ConsultorDeRecetaSupabase(catalogDb),
    descontadorDeInventario: new DescontadorDeInventarioSupabase(inventoryDb),
  };
}
