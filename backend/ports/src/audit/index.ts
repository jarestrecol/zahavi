/** Entrada para registrar un evento en el audit log. */
export interface AuditEntry {
  /** Tipo de evento de negocio, ej: 'SESION_INICIADA', 'ORDEN_EJECUTADA'. */
  readonly eventType: string;
  /** UUID del usuario que ejecutó la acción — siempre desde JWT, nunca del cliente. */
  readonly actorId: string;
  /** Contexto específico del evento (no incluir PII sensible sin enmascarar). */
  readonly payload: Record<string, unknown>;
}

/**
 * Puerto de salida para persistir entradas en el audit log append-only.
 *
 * La implementación es responsable de:
 * - Obtener el hash del último registro (`prev_hash`).
 * - Calcular `hash = SHA-256(prev_hash|eventType|actorId|payload|ocurridoEn)`.
 * - Insertar el nuevo registro de forma atómica.
 *
 * Si el log falla, la implementación debe absorber el error y loguearlo
 * en el sistema de monitoreo SIN relanzar, para no bloquear la operación principal.
 */
export interface IAuditLogger {
  log(entry: AuditEntry, correlacionId: string): Promise<void>;
}
