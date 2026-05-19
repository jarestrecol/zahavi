import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;

export interface AuditLogTable {
  id: string;
  seq: ColumnType<number, never, never>; // BIGSERIAL — solo lectura
  prev_hash: string;
  event_type: string;
  actor_id: string;
  payload: ColumnType<Record<string, unknown>, string, string>;
  ocurrido_en: Timestamp;
  hash: string;
}

export interface AuditDatabase {
  'audit.audit_log': AuditLogTable;
}
