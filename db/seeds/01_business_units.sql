-- Seed: Unidades de negocio iniciales
-- Zahavi tiene 2 puntos de venta + 1 planta central de producción

INSERT INTO identity.business_units (id, nombre, tipo, estado, creado_en)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Planta Central',   'produccion',    'activa', now()),
  ('10000000-0000-0000-0000-000000000002', 'Punto 1 — Centro', 'punto_de_venta', 'activa', now())
ON CONFLICT (id) DO NOTHING;
