-- Seed: Categorías del catálogo

INSERT INTO catalog.categories (id, nombre, padre_id, orden, estado, creado_en, actualizado_en)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'Pan',        NULL, 1, 'activa', now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'Pastelería',  NULL, 2, 'activa', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'Bebidas',    NULL, 3, 'activa', now(), now()),
  ('30000000-0000-0000-0000-000000000004', 'Empaques',   NULL, 4, 'activa', now(), now())
ON CONFLICT (id) DO NOTHING;
