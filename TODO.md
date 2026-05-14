# TODO — Deuda técnica activa

> Deuda aceptada conscientemente. Cada item tiene un ID rastreable en `PROYECTO_ESTADO.md`.

## Alta prioridad (seguridad / corrección)

- **D-011** — RLS Catalog/Inventory: defensa en profundidad. Las políticas actuales validan `business_unit_id` a nivel de fila pero no cruzan contra `user_business_units` para verificar la membresía activa del JWT. Requiere Docker disponible para probar sin romper sesiones. Ver ADR-0003.
- **D-002** — E2E tests de Identity no corren sin Docker (supabase local).
- **D-003** — E2E tests de Catalog + Inventory no escritos.
- **D-005** — CI/CD pipeline GitHub Actions: typecheck + lint + test + gitleaks + semgrep.

## Media prioridad (calidad / operaciones)

- **D-001** — Docker: habilitar virtualización en BIOS para poder correr `docker compose up` localmente.
- **D-006** — TSDoc: auditar y completar en clases/funciones públicas del dominio y application.
- **A-001** — Accesibilidad WCAG AA pendiente en frontend:
  - Todos los `<input>` de Login deben tener `id` + `htmlFor` asociados (SC 1.3.1).
  - `<input type="search">` en Products sin `aria-label` (SC 1.3.1).
  - `<select>` de SwitchContext: `aria-label` ya añadido; verificar contraste visual.
  - Botón "Salir" en AppLayout: target táctil demasiado pequeño para tablet (WCAG 2.5.8).
  - `<th>` de tablas sin `scope="col"`.
  - Badge de estado en Products usa solo color sin texto/icono alternativo (SC 1.4.1).
- **A-002** — UX improvements: debounce 300ms en búsqueda de Products; indicador offline (`navigator.onLine`); NavLink con estado activo en sidebar.

## Baja prioridad (cosméticos / futuro)

- **D-008** — Tema oscuro en frontend.
- **D-009** — i18n completo (actualmente hardcodeado en español Colombia).
- **D-010** — Offline-first con SQLite local (Iteración 7).
