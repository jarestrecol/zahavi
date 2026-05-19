-- D-030: Tabla de auditoría append-only con hash encadenado
-- Cada fila encadena su hash al hash de la fila anterior, generando una cadena
-- inmutable verificable fuera del sistema.
--
-- Hash = SHA-256(prev_hash || '|' || event_type || '|' || actor_id || '|' || payload::text || '|' || ocurrido_en)
-- El primer registro usa prev_hash = 'GENESIS'.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq          BIGSERIAL   NOT NULL UNIQUE,   -- orden absoluto de inserción
  prev_hash    TEXT        NOT NULL,          -- hash del registro anterior (o 'GENESIS')
  event_type   TEXT        NOT NULL,          -- ej. 'SESION_INICIADA', 'ORDEN_EJECUTADA'
  actor_id     UUID        NOT NULL,          -- usuario que ejecutó la acción
  payload      JSONB       NOT NULL,          -- contexto específico del evento
  ocurrido_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  hash         TEXT        NOT NULL           -- SHA-256 calculado en la capa de aplicación
);

-- Solo lectura secuencial: índice por seq y por actor
CREATE INDEX idx_audit_log_seq        ON audit.audit_log (seq DESC);
CREATE INDEX idx_audit_log_actor      ON audit.audit_log (actor_id);
CREATE INDEX idx_audit_log_event_type ON audit.audit_log (event_type);
CREATE INDEX idx_audit_log_ocurrido   ON audit.audit_log (ocurrido_en DESC);

-- Append-only via RLS: se permite INSERT pero NO UPDATE ni DELETE
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_log FORCE ROW LEVEL SECURITY;

-- ADMIN y SUPERADMIN pueden leer la auditoría
CREATE POLICY "audit_log_select" ON audit.audit_log
  FOR SELECT
  USING (
    (auth.jwt() ->> 'zahavi_rol') IN ('ADMIN', 'SUPERADMIN')
  );

-- Cualquier usuario autenticado puede insertar (la API valida actor_id desde JWT)
CREATE POLICY "audit_log_insert" ON audit.audit_log
  FOR INSERT
  WITH CHECK (true);

-- Sin políticas UPDATE ni DELETE → la tabla es efectivamente append-only para todos los roles
-- (solo service_role puede hacer UPDATE/DELETE, y no se usa en esta API)

COMMENT ON TABLE audit.audit_log IS
  'Registro de auditoría append-only con hash encadenado. '
  'Cada fila incluye el hash SHA-256 de la fila anterior para detectar manipulaciones.';

COMMENT ON COLUMN audit.audit_log.seq          IS 'Número de secuencia absoluto (BIGSERIAL), define el orden de la cadena';
COMMENT ON COLUMN audit.audit_log.prev_hash    IS 'Hash del registro con seq-1, o ''GENESIS'' para el primero';
COMMENT ON COLUMN audit.audit_log.hash         IS 'SHA-256(prev_hash|event_type|actor_id|payload::text|ocurrido_en)';
