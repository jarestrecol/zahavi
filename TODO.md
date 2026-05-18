# TODO — Deuda técnica activa

> Deuda aceptada conscientemente. Cada item tiene un ID rastreable en `PROYECTO_ESTADO.md`.

## Alta prioridad (seguridad / corrección)

- **D-002** — E2E tests de Identity no corren sin Docker (supabase local). Bloqueado por D-001.
- **D-003** — E2E tests de Catalog + Inventory no escritos. Bloqueado por D-001.
- **D-023** — GitHub secret `SUPABASE_DB_PASSWORD` desactualizado tras reset de Supabase. CI falla en `supabase db push`. Requiere acción del usuario en GitHub → Settings → Secrets → Actions.

## Media prioridad (calidad / operaciones)

- **D-001** — Docker: habilitar virtualización en BIOS para poder correr `docker compose up` localmente.
- **D-012** — `FacturaLinea.varianteId` usa `string` en lugar de branded type. Migrar cuando catalog tenga `tasa_iva`.
- **A-001** — Accesibilidad WCAG AA pendiente en frontend:
  - Todos los `<input>` de Login deben tener `id` + `htmlFor` asociados (SC 1.3.1).
  - `<input type="search">` en Products sin `aria-label` (SC 1.3.1).
  - `<th>` de tablas sin `scope="col"`.
  - Badge de estado en Products usa solo color sin texto/icono alternativo (SC 1.4.1).
  - Botón "Salir" en AppLayout: target táctil pequeño para tablet (WCAG 2.5.8).
- **A-002** — UX improvements:
  - Debounce 300ms en búsqueda de Products (evita requests en cada tecla).
  - Indicador offline (`navigator.onLine`) para operadores de tablet.
  - NavLink con estado activo en sidebar.

## Baja prioridad (cosméticos / futuro)

- **D-008** — Tema oscuro en frontend.
- **D-009** — i18n completo (actualmente hardcodeado en español Colombia).
- **D-010** — Offline-first con SQLite local.
