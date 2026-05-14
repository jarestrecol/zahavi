import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { IReportingRepository } from '@zahavi/ports';
import type { SalesDatabase } from '../sales/schema.js';
import { ReportingRepositorySupabase } from './ReportingRepositorySupabase.js';

export interface ReportingAdapters {
  repositorioDeReportes: IReportingRepository;
}

export function createReportingAdapters(databaseUrl: string): ReportingAdapters {
  const ssl = process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : undefined;

  const salesDb = new Kysely<SalesDatabase>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString: databaseUrl, ssl }) }),
  });

  return {
    repositorioDeReportes: new ReportingRepositorySupabase(salesDb),
  };
}
