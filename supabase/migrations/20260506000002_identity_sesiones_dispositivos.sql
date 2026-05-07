-- ============================================================
-- Migration: 20260506000002_identity_sesiones_dispositivos
-- BC Identity: dispositivos_autorizados, historial, sesiones
-- Depende de: 20260506000001_identity_schema_usuarios
-- ============================================================

-- ── 1. Tabla: identity.dispositivos_autorizados ──────────────
CREATE TABLE identity.dispositivos_autorizados (
  id     UUID NOT NULL DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,

  CONSTRAINT pk_dispositivos
    PRIMARY KEY (id),

  CONSTRAINT uq_dispositivos_nombre
    UNIQUE (nombre),

  CONSTRAINT chk_dispositivos_nombre_no_vacio
    CHECK (length(trim(nombre)) > 0)
);

COMMENT ON TABLE  identity.dispositivos_autorizados        IS 'Aggregate DispositivoAutorizado. Tablets autorizadas para WORKER.';
COMMENT ON COLUMN identity.dispositivos_autorizados.nombre IS 'Nombre descriptivo único (p.ej. "Caja 1", "Mesa norte").';

-- ── 2. Tabla: identity.historial_estados_dispositivo ─────────
-- Append-only desde el dominio. Se elimina y reinserta en cada guardar().
CREATE TABLE identity.historial_estados_dispositivo (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  dispositivo_id UUID        NOT NULL,
  estado         TEXT        NOT NULL,
  cambiado_en    TIMESTAMPTZ NOT NULL,
  cambiado_por   UUID        NOT NULL,
  motivo         TEXT        NOT NULL,
  orden          INTEGER     NOT NULL,

  CONSTRAINT pk_historial
    PRIMARY KEY (id),

  -- RESTRICT en lugar de CASCADE: los dispositivos nunca se eliminan (solo se revocan).
  -- Un intento de borrar un dispositivo con historial fallará, protegiendo la auditoría.
  CONSTRAINT fk_historial_dispositivo
    FOREIGN KEY (dispositivo_id)
    REFERENCES identity.dispositivos_autorizados(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_historial_cambiado_por
    FOREIGN KEY (cambiado_por)
    REFERENCES identity.usuarios(id),

  CONSTRAINT chk_historial_estado
    CHECK (estado IN ('activo', 'revocado')),

  CONSTRAINT chk_historial_orden_positivo
    CHECK (orden >= 0),

  CONSTRAINT uq_historial_dispositivo_orden
    UNIQUE (dispositivo_id, orden)
);

COMMENT ON TABLE  identity.historial_estados_dispositivo IS 'Historial inmutable de cambios de estado del dispositivo. Cada guardar() del aggregate reemplaza todas las entradas.';
COMMENT ON COLUMN identity.historial_estados_dispositivo.orden IS 'Posición en el array historialDeEstados del aggregate. Determina el orden cronológico.';

-- Índices de historial
-- Nota: uq_historial_dispositivo_orden ya crea un índice B-tree sobre (dispositivo_id, orden).
-- No se necesita índice explícito adicional para ese par de columnas.
CREATE INDEX idx_historial_cambiado_por
  ON identity.historial_estados_dispositivo (cambiado_por);

-- ── 3. Tabla: identity.sesiones ──────────────────────────────
CREATE TABLE identity.sesiones (
  id                         UUID        NOT NULL DEFAULT gen_random_uuid(),
  usuario_id                 UUID        NOT NULL,
  rol                        TEXT        NOT NULL,
  dispositivo_id             UUID,
  contexto_dispositivo       TEXT        NOT NULL,
  iniciada_en                TIMESTAMPTZ NOT NULL,
  ultima_actividad_en        TIMESTAMPTZ NOT NULL,
  expira_en_absoluto         TIMESTAMPTZ NOT NULL,
  estado_sesion              TEXT        NOT NULL DEFAULT 'activa',
  estado_bloqueo             TEXT        NOT NULL DEFAULT 'desbloqueada',
  bloqueada_en               TIMESTAMPTZ,
  cerrada_en                 TIMESTAMPTZ,
  motivo_de_cierre           TEXT,
  -- Política snapshoteada al abrir la sesión (inmutable)
  politica_umbral_bloqueo_ms INTEGER     NOT NULL,
  politica_umbral_cierre_ms  INTEGER     NOT NULL,
  politica_tope_absoluto_ms  INTEGER     NOT NULL,
  politica_limite_simultaneo INTEGER     NOT NULL,
  politica_requiere_dispositivo BOOLEAN  NOT NULL,
  actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_sesiones
    PRIMARY KEY (id),

  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES identity.usuarios(id),

  CONSTRAINT fk_sesiones_dispositivo
    FOREIGN KEY (dispositivo_id)
    REFERENCES identity.dispositivos_autorizados(id),

  CONSTRAINT chk_sesiones_rol
    CHECK (rol IN ('SUPERADMIN', 'ADMIN', 'WORKER')),

  CONSTRAINT chk_sesiones_estado
    CHECK (estado_sesion IN ('activa', 'cerrada', 'expirada', 'revocada')),

  CONSTRAINT chk_sesiones_bloqueo
    CHECK (estado_bloqueo IN ('bloqueada', 'desbloqueada')),

  CONSTRAINT chk_sesiones_contexto
    CHECK (contexto_dispositivo IN ('compartido', 'personal')),

  -- WORKER siempre necesita dispositivo_id
  CONSTRAINT chk_sesiones_worker_dispositivo
    CHECK (rol != 'WORKER' OR dispositivo_id IS NOT NULL),

  -- cerrada_en y motivo van juntos
  CONSTRAINT chk_sesiones_cierre_coherente
    CHECK (
      (cerrada_en IS NULL AND motivo_de_cierre IS NULL)
      OR (cerrada_en IS NOT NULL AND motivo_de_cierre IS NOT NULL)
    ),

  CONSTRAINT chk_sesiones_motivo_cierre
    CHECK (
      motivo_de_cierre IS NULL
      OR motivo_de_cierre IN (
        'cierre_voluntario', 'inactividad', 'tope_absoluto',
        'revocacion_admin', 'dispositivo_revocado',
        'cambio_de_rol', 'usuario_deshabilitado'
      )
    ),

  CONSTRAINT chk_sesiones_politica_positiva
    CHECK (
      politica_umbral_bloqueo_ms > 0
      AND politica_umbral_cierre_ms > 0
      AND politica_tope_absoluto_ms > 0
      AND politica_limite_simultaneo >= 1
    )
);

COMMENT ON TABLE  identity.sesiones IS 'Aggregate Sesion. Política snapshoteada al abrir; estado mutable vía upserts.';
COMMENT ON COLUMN identity.sesiones.politica_umbral_bloqueo_ms IS 'Ms de inactividad para bloquear pantalla (solo contexto=compartido).';
COMMENT ON COLUMN identity.sesiones.politica_umbral_cierre_ms  IS 'Ms de inactividad para cerrar la sesión definitivamente.';
COMMENT ON COLUMN identity.sesiones.politica_tope_absoluto_ms  IS 'Ms máximos desde iniciada_en sin importar actividad.';

-- Trigger updated_at
CREATE TRIGGER trg_sesiones_actualizado_en
  BEFORE UPDATE ON identity.sesiones
  FOR EACH ROW EXECUTE FUNCTION identity.set_actualizado_en();

-- Índices de sesiones
CREATE INDEX idx_sesiones_usuario_estado
  ON identity.sesiones (usuario_id, estado_sesion);

CREATE INDEX idx_sesiones_dispositivo_estado
  ON identity.sesiones (dispositivo_id, estado_sesion)
  WHERE dispositivo_id IS NOT NULL;

CREATE INDEX idx_sesiones_expiracion
  ON identity.sesiones (estado_sesion, expira_en_absoluto)
  WHERE estado_sesion = 'activa';

CREATE INDEX idx_sesiones_actividad
  ON identity.sesiones (estado_sesion, ultima_actividad_en)
  WHERE estado_sesion = 'activa';

-- Índice compuesto para el job de expiración (listarPotencialmenteExpiradas)
CREATE INDEX idx_sesiones_sweep
  ON identity.sesiones (expira_en_absoluto, ultima_actividad_en)
  WHERE estado_sesion = 'activa';

-- ── 4. RLS: dispositivos_autorizados ─────────────────────────
ALTER TABLE identity.dispositivos_autorizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_dispositivos_superadmin_all
  ON identity.dispositivos_autorizados FOR ALL
  TO authenticated
  USING  (identity.jwt_rol() = 'SUPERADMIN')
  WITH CHECK (identity.jwt_rol() = 'SUPERADMIN');

CREATE POLICY pol_dispositivos_read_auth
  ON identity.dispositivos_autorizados FOR SELECT
  TO authenticated
  USING (identity.jwt_rol() IN ('ADMIN', 'WORKER'));

-- ── 5. RLS: historial_estados_dispositivo ────────────────────
-- Solo lectura para SUPERADMIN. Escrituras solo vía backend (superuser).
ALTER TABLE identity.historial_estados_dispositivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_historial_superadmin_select
  ON identity.historial_estados_dispositivo FOR SELECT
  TO authenticated
  USING (identity.jwt_rol() = 'SUPERADMIN');

-- ── 6. RLS: sesiones ─────────────────────────────────────────
ALTER TABLE identity.sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_sesiones_superadmin_all
  ON identity.sesiones FOR ALL
  TO authenticated
  USING  (identity.jwt_rol() = 'SUPERADMIN')
  WITH CHECK (identity.jwt_rol() = 'SUPERADMIN');

-- Cada usuario ve solo sus propias sesiones.
-- Intención: INSERT/UPDATE de sesiones ocurre exclusivamente vía el backend
-- (Fastify + Kysely como superuser). El cliente web nunca escribe directamente.
CREATE POLICY pol_sesiones_self_select
  ON identity.sesiones FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- ── 7. Grants ────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON identity.dispositivos_autorizados TO authenticated;
GRANT SELECT                  ON identity.historial_estados_dispositivo TO authenticated;
GRANT SELECT, INSERT, UPDATE  ON identity.sesiones TO authenticated;

-- ============================================================
-- DOWN (rollback manual):
--   DROP TABLE IF EXISTS identity.sesiones CASCADE;
--   DROP TABLE IF EXISTS identity.historial_estados_dispositivo CASCADE;
--   DROP TABLE IF EXISTS identity.dispositivos_autorizados CASCADE;
-- ============================================================
