---
description: Ejecuta auditoría de seguridad integral. Invoca al security-auditor.
argument-hint: "[opcional: full | staged | <path>]"
allowed-tools: Read, Grep, Glob, Bash, Task
---

Invoca al subagente **security-auditor** para hacer una pasada de seguridad sobre el proyecto Zahavi.

Modos según `$ARGUMENTS`:
- `full` → escanea todo el repo.
- `staged` (default si no hay argumento) → solo cambios staged (`git diff --staged --name-only`).
- `<path>` → solo esa ruta.

El subagente debe ejecutar como mínimo:
- `gitleaks detect --source . --no-git -v`
- `semgrep --config=auto packages/ apps/`
- `pnpm audit --audit-level=high` (si `pnpm-lock.yaml` existe)
- Revisar manualmente migraciones nuevas en `db/migrations/` para validar RLS.
- Revisar endpoints HTTP nuevos por verificación de auth/autorización.

Reporta hallazgos críticos, medios, informativos. Bloquea commit si hay hallazgos críticos.
