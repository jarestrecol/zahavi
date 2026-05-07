-- ============================================================
-- Migration: 20260506000001_identity_schema_usuarios
-- BC Identity: schema, funciones de soporte, tabla usuarios
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS identity;
COMMENT ON SCHEMA identity IS 'Bounded Context Identity: usuarios, sesiones, dispositivos autorizados.';

-- ── 2. Función reutilizable: updated_at ──────────────────────
CREATE OR REPLACE FUNCTION identity.set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION identity.set_actualizado_en() IS 'Actualiza actualizado_en en cada UPDATE.';

-- ── 3. Función: leer rol del JWT ──────────────────────────────
-- Evita consultas recursivas en políticas RLS de la tabla usuarios.
CREATE OR REPLACE FUNCTION identity.jwt_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public AS
$$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.zahavi_rol', TRUE), ''),
    (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_rol')
  );
$$;
COMMENT ON FUNCTION identity.jwt_rol() IS 'Devuelve el claim zahavi_rol del JWT activo. Usar en políticas RLS para evitar recursión.';

-- ── 4. Tabla: identity.usuarios ──────────────────────────────
CREATE TABLE identity.usuarios (
  id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  nombre_completo TEXT        NOT NULL,
  rol             TEXT        NOT NULL,
  estado          TEXT        NOT NULL DEFAULT 'activo',
  tipo_credencial TEXT        NOT NULL,
  hash_contrasena TEXT,
  secreto_totp    TEXT,
  totp_verificado BOOLEAN     NOT NULL DEFAULT FALSE,
  hash_pin        TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por      UUID,

  CONSTRAINT pk_usuarios
    PRIMARY KEY (id),

  CONSTRAINT uq_usuarios_email
    UNIQUE (email),

  -- FK diferida para permitir bootstrap del primer SUPERADMIN (creado_por = NULL)
  CONSTRAINT fk_usuarios_creado_por
    FOREIGN KEY (creado_por) REFERENCES identity.usuarios(id)
    DEFERRABLE INITIALLY DEFERRED,

  CONSTRAINT chk_usuarios_rol
    CHECK (rol IN ('SUPERADMIN', 'ADMIN', 'WORKER')),

  CONSTRAINT chk_usuarios_estado
    CHECK (estado IN ('activo', 'deshabilitado')),

  CONSTRAINT chk_usuarios_tipo_credencial
    CHECK (tipo_credencial IN ('navegador', 'tablet')),

  -- Navegador requiere hash_contrasena, prohíbe hash_pin
  CONSTRAINT chk_usuarios_cred_navegador
    CHECK (
      tipo_credencial != 'navegador'
      OR (hash_contrasena IS NOT NULL AND hash_pin IS NULL)
    ),

  -- Tablet requiere hash_pin, prohíbe hash_contrasena
  CONSTRAINT chk_usuarios_cred_tablet
    CHECK (
      tipo_credencial != 'tablet'
      OR (hash_pin IS NOT NULL AND hash_contrasena IS NULL)
    ),

  -- Solo roles navegador pueden tener secreto TOTP
  CONSTRAINT chk_usuarios_totp_solo_navegador
    CHECK (
      tipo_credencial = 'navegador'
      OR (secreto_totp IS NULL AND totp_verificado = FALSE)
    )
);

COMMENT ON TABLE  identity.usuarios              IS 'Aggregate Usuario. Persiste credenciales hasheadas y estado del usuario.';
COMMENT ON COLUMN identity.usuarios.secreto_totp IS 'Secreto TOTP cifrado a nivel de aplicación (AES-256). Nunca se expone en texto claro.';
COMMENT ON COLUMN identity.usuarios.hash_contrasena IS 'Hash argon2id o bcrypt. Solo tipo_credencial=navegador.';
COMMENT ON COLUMN identity.usuarios.hash_pin     IS 'Hash bcrypt del PIN de 6 dígitos. Solo tipo_credencial=tablet.';
COMMENT ON COLUMN identity.usuarios.creado_por   IS 'NULL solo para el SUPERADMIN inicial (bootstrap).';

-- ── 5. Trigger updated_at ────────────────────────────────────
CREATE TRIGGER trg_usuarios_actualizado_en
  BEFORE UPDATE ON identity.usuarios
  FOR EACH ROW EXECUTE FUNCTION identity.set_actualizado_en();

-- ── 6. Índices ───────────────────────────────────────────────
CREATE INDEX idx_usuarios_rol_estado
  ON identity.usuarios (rol, estado);

CREATE INDEX idx_usuarios_creado_por
  ON identity.usuarios (creado_por)
  WHERE creado_por IS NOT NULL;

-- ── 7. RLS ───────────────────────────────────────────────────
ALTER TABLE identity.usuarios ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN (leído desde JWT, sin recursión): acceso total
CREATE POLICY pol_usuarios_superadmin_all
  ON identity.usuarios FOR ALL
  TO authenticated
  USING  (identity.jwt_rol() = 'SUPERADMIN')
  WITH CHECK (identity.jwt_rol() = 'SUPERADMIN');

-- ADMIN: lee WORKERs + su propio perfil
CREATE POLICY pol_usuarios_admin_workers
  ON identity.usuarios FOR SELECT
  TO authenticated
  USING (identity.jwt_rol() = 'ADMIN' AND rol = 'WORKER');

-- Cualquier usuario autenticado: lee su propio perfil
CREATE POLICY pol_usuarios_self
  ON identity.usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- anon: sin acceso (RLS activo + sin policy para anon = denegación total)

-- ── 8. Grants ────────────────────────────────────────────────
-- Solo el rol authenticated (usado por PostgREST con JWT) accede al schema.
-- El backend usa la conexión directa postgres (superuser) que bypasea RLS.
-- Se otorgan solo las columnas no sensibles; hash_contrasena, hash_pin y
-- secreto_totp nunca se exponen al cliente web.
GRANT USAGE ON SCHEMA identity TO authenticated;
GRANT SELECT (
  id, email, nombre_completo, rol, estado, tipo_credencial,
  totp_verificado, creado_en, actualizado_en, creado_por
) ON identity.usuarios TO authenticated;
GRANT INSERT, UPDATE ON identity.usuarios TO authenticated;

-- ============================================================
-- DOWN (rollback manual):
--   DROP TABLE IF EXISTS identity.usuarios CASCADE;
--   DROP FUNCTION IF EXISTS identity.set_actualizado_en();
--   DROP FUNCTION IF EXISTS identity.jwt_rol();
--   DROP SCHEMA IF EXISTS identity CASCADE;
-- ============================================================
