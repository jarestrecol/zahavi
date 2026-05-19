# TODO — Deuda técnica activa

> Deuda aceptada conscientemente. Cada item tiene un ID rastreable en `CLAUDE.md §7`.

## Alta prioridad (seguridad / corrección)

- **D-030** — Tabla `audit.log` global append-only con hash encadenado (scope futuro).

## Media prioridad (calidad / operaciones)

- **D-027** — `docker/web.Dockerfile` no actualizado con paths `frontend/`.
- **D-028** — Verificar rutas Playwright post-reorganización (`qa/e2e/`).
- **D-029** — Artefactos `backend/domain/*/dist/**` en git; agregar `dist/` al `.gitignore` de dominio.

## Baja prioridad (cosméticos / futuro)

- **D-008** — Tema oscuro en frontend.
- **D-009** — i18n completo (actualmente hardcodeado en español Colombia).
- **D-010** — Offline-first con SQLite local para tablets.
