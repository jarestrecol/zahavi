import { createHash } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { IAuditLogger, AuditEntry } from '@zahavi/ports';
import type { AuditDatabase } from './schema.js';

/**
 * Implementa `IAuditLogger` sobre `audit.audit_log` en Supabase/PostgreSQL.
 *
 * Algoritmo de hash chaining:
 *   1. SELECT hash FROM audit.audit_log ORDER BY seq DESC LIMIT 1  → prevHash
 *   2. Si no hay filas: prevHash = 'GENESIS'
 *   3. hash = SHA-256(prevHash + '|' + eventType + '|' + actorId + '|' + JSON.stringify(payload) + '|' + iso)
 *   4. INSERT INTO audit.audit_log (prev_hash, event_type, actor_id, payload, ocurrido_en, hash)
 *
 * Las colisiones por concurrencia son posibles en despliegues multi-instancia;
 * en este piloto (single-instance en Render) el riesgo es negligible.
 * Para multi-instancia se requiere una transacción SERIALIZABLE o una cola FIFO.
 *
 * Si el INSERT falla, el error se absorbe y se registra en stderr para no
 * bloquear la operación de negocio principal.
 */
export class AuditLoggerSupabase implements IAuditLogger {
  constructor(private readonly db: Kysely<AuditDatabase>) {}

  async log(entry: AuditEntry, _correlacionId: string): Promise<void> {
    try {
      const iso = new Date().toISOString();

      const lastRow = await this.db
        .selectFrom('audit.audit_log')
        .select('hash')
        .orderBy('seq', 'desc')
        .limit(1)
        .executeTakeFirst();

      const prevHash = lastRow?.hash ?? 'GENESIS';
      const payloadText = JSON.stringify(entry.payload);
      const hash = createHash('sha256')
        .update(`${prevHash}|${entry.eventType}|${entry.actorId}|${payloadText}|${iso}`)
        .digest('hex');

      await this.db
        .insertInto('audit.audit_log')
        .values({
          id: crypto.randomUUID(),
          prev_hash: prevHash,
          event_type: entry.eventType,
          actor_id: entry.actorId,
          payload: payloadText,
          ocurrido_en: iso,
          hash,
        })
        .execute();
    } catch (err) {
      // El audit log NO debe bloquear la operación principal
      console.error('[AuditLogger] error al persistir entrada de auditoría:', err);
    }
  }
}
