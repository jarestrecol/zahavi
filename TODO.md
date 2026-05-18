# TODO — Deuda técnica activa

> Deuda aceptada conscientemente. Cada item tiene un ID rastreable en `PROYECTO_ESTADO.md`.

## Alta prioridad (seguridad / corrección)

- **D-002** — E2E tests de Identity escritos (`apps/api/e2e/identity.e2e.ts`). Ejecutar cuando Docker esté disponible (D-001).
- **D-003** — E2E tests de Catalog + Inventory escritos (`apps/api/e2e/catalog-inventory.e2e.ts`). Ejecutar cuando Docker esté disponible (D-001).

## Media prioridad (calidad / operaciones)

- **D-001** — Docker: habilitar virtualización en BIOS para poder correr `docker compose up` localmente.

## Baja prioridad (cosméticos / futuro)

- **D-008** — Tema oscuro en frontend.
- **D-009** — i18n completo (actualmente hardcodeado en español Colombia).
- **D-010** — Offline-first con SQLite local.
