import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  IOrdenDeProduccionRepository,
  IDespachoRepository,
  IConsultorDeRecetaDeProduccion,
} from '@zahavi/ports';
import type { ProductionDatabase } from './schema.js';
import type { CatalogDatabase } from '../catalog/schema.js';
import { RepositorioDeOrdenesSupabase } from './RepositorioDeOrdenesSupabase.js';
import { RepositorioDeDespachoSupabase } from './RepositorioDeDespachoSupabase.js';
import { ConsultorDeRecetaSupabase } from './ConsultorDeRecetaSupabase.js';

export interface ProductionAdapters {
  repositorioDeOrdenes: IOrdenDeProduccionRepository;
  repositorioDeDespachos: IDespachoRepository;
  consultorDeReceta: IConsultorDeRecetaDeProduccion;
}

export function createProductionAdapters(databaseUrl: string): ProductionAdapters {
  const ssl = process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : undefined;

  const productionPool = new Pool({ connectionString: databaseUrl, ssl });
  const catalogPool = new Pool({ connectionString: databaseUrl, ssl });

  const productionDb = new Kysely<ProductionDatabase>({
    dialect: new PostgresDialect({ pool: productionPool }),
  });

  const catalogDb = new Kysely<CatalogDatabase>({
    dialect: new PostgresDialect({ pool: catalogPool }),
  });

  return {
    repositorioDeOrdenes: new RepositorioDeOrdenesSupabase(productionDb),
    repositorioDeDespachos: new RepositorioDeDespachoSupabase(productionDb),
    consultorDeReceta: new ConsultorDeRecetaSupabase(catalogDb),
  };
}
