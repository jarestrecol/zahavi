import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  IMesaRepository,
  IComandaRepository,
  ICobroRepository,
  IFacturaRepository,
  IConsultorDeProductoParaVentas,
} from '@zahavi/ports';
import type { SalesDatabase } from './schema.js';
import type { CatalogDatabase } from '../catalog/schema.js';
import { RepositorioDeMesaSupabase } from './RepositorioDeMesaSupabase.js';
import { RepositorioDeComandaSupabase } from './RepositorioDeComandaSupabase.js';
import { RepositorioDeCobroSupabase } from './RepositorioDeCobroSupabase.js';
import { RepositorioDeFacturaSupabase } from './RepositorioDeFacturaSupabase.js';
import { ConsultorDeProductoSupabase } from './ConsultorDeProductoSupabase.js';

export interface SalesAdapters {
  repositorioDeMesas: IMesaRepository;
  repositorioDeComandas: IComandaRepository;
  repositorioDeCobros: ICobroRepository;
  repositorioDeFacturas: IFacturaRepository;
  consultorDeProducto: IConsultorDeProductoParaVentas;
}

export function createSalesAdapters(pool: Pool): SalesAdapters {
  const salesDb = new Kysely<SalesDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  const catalogDb = new Kysely<CatalogDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeMesas: new RepositorioDeMesaSupabase(salesDb),
    repositorioDeComandas: new RepositorioDeComandaSupabase(salesDb),
    repositorioDeCobros: new RepositorioDeCobroSupabase(salesDb),
    repositorioDeFacturas: new RepositorioDeFacturaSupabase(salesDb),
    consultorDeProducto: new ConsultorDeProductoSupabase(catalogDb),
  };
}
