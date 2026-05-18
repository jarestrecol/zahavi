# TODO — Deuda técnica activa

> Deuda aceptada conscientemente. Cada item tiene un ID rastreable en `PROYECTO_ESTADO.md`.

## Alta prioridad (seguridad / corrección)

- **D-002** — E2E tests de Identity no corren sin Docker (supabase local). Bloqueado por D-001.
- **D-003** — E2E tests de Catalog + Inventory no escritos. Bloqueado por D-001.

## Media prioridad (calidad / operaciones)

- **D-001** — Docker: habilitar virtualización en BIOS para poder correr `docker compose up` localmente.
- **D-012** — `FacturaLinea.varianteId` usa `string` en lugar de branded type. Migrar cuando catalog tenga `tasa_iva`.

## Baja prioridad (cosméticos / futuro)

- **D-008** — Tema oscuro en frontend.
- **D-009** — i18n completo (actualmente hardcodeado en español Colombia).
- **D-010** — Offline-first con SQLite local.
