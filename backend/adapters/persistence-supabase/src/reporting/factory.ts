import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { IReportingRepository } from '@zahavi/ports';
import type { SalesDatabase } from '../sales/schema.js';
import { ReportingRepositorySupabase } from './ReportingRepositorySupabase.js';

export interface ReportingAdapters {
  repositorioDeReportes: IReportingRepository;
}

export function createReportingAdapters(pool: Pool): ReportingAdapters {
  const salesDb = new Kysely<SalesDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeReportes: new ReportingRepositorySupabase(salesDb),
  };
}
