-- Seed: Usuarios de prueba
-- IMPORTANTE: Las contraseñas son hashes bcrypt de las contraseñas de desarrollo.
-- Contraseña de julian@zahavi.local y admin@zahavi.local: "Zahavi2026!"
-- worker@zahavi.local usa PIN 123456 (hash bcrypt)

INSERT INTO identity.usuarios (id, email, nombre_completo, rol, estado, tipo_credencial, hash_contrasena, secreto_totp, totp_verificado, hash_pin, creado_en, creado_por)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'julian@zahavi.local',
    'Julian Restrepo',
    'SUPERADMIN',
    'activo',
    'navegador',
    '$2b$12$K8GpbTuUqGGWAT.Z3q7wuuqmJkC2N5RiY9vBl8lrNhVT1JcC1nmEO',
    NULL,
    false,
    NULL,
    now(),
    NULL
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'admin@zahavi.local',
    'Administrador Punto 1',
    'ADMIN',
    'activo',
    'navegador',
    '$2b$12$K8GpbTuUqGGWAT.Z3q7wuuqmJkC2N5RiY9vBl8lrNhVT1JcC1nmEO',
    NULL,
    false,
    NULL,
    now(),
    '20000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'worker@zahavi.local',
    'Trabajador Uno',
    'WORKER',
    'activo',
    'tablet',
    NULL,
    NULL,
    false,
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGW6naSNiKuMhxoFhi',
    now(),
    '20000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Asignaciones usuario-unidad de negocio
INSERT INTO identity.user_business_units (user_id, business_unit_id, asignado_en)
VALUES
  -- SUPERADMIN accede a ambas unidades
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now()),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', now()),
  -- ADMIN solo accede a Punto 1
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', now()),
  -- WORKER asignado a Punto 1
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', now())
ON CONFLICT (user_id, business_unit_id) DO NOTHING;
