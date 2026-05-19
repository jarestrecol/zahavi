import { Kysely, PostgresDialect } from 'kysely';
import type { Pool } from 'pg';
import type { IAuditLogger } from '@zahavi/ports';
import type { AuditDatabase } from './schema.js';
import { AuditLoggerSupabase } from './AuditLoggerSupabase.js';

export function createAuditLogger(pool: Pool): IAuditLogger {
  const db = new Kysely<AuditDatabase>({
    dialect: new PostgresDialect({ pool }),
  });
  return new AuditLoggerSupabase(db);
}
