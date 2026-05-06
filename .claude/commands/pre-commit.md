---
description: Ejecuta la cadena completa de revisión antes de commitear (arquitectura, seguridad, tests, lint, code review).
allowed-tools: Read, Grep, Glob, Bash, Task
---

Cadena de pre-commit obligatoria del proyecto Zahavi. Ejecútala antes de `git commit`.

## Pasos (en orden, abortar al primer fallo)

1. **Typecheck**
   ```bash
   pnpm typecheck
   ```

2. **Lint**
   ```bash
   pnpm lint
   ```

3. **Tests unitarios y de integración**
   ```bash
   pnpm test
   ```

4. **architect-guardian** sobre los archivos staged.

5. **security-auditor** en modo `staged`.

6. **db-reviewer** si hay cambios en `db/migrations/**`.

7. **ux-ui-reviewer** si hay cambios en `apps/web/src/**`.

8. **code-reviewer** sobre el diff staged.

9. **Verifica mensaje de commit** propuesto contra Conventional Commits.

## Si todo pasa

Reporta:
```
PRE-COMMIT — ✅ APROBADO

Archivos: N (+X / -Y líneas)
Tests: X pasaron
Cobertura: XX%

Mensaje de commit sugerido:
<tipo>(<scope>): <descripción>

<cuerpo opcional>
```

## Si algo falla

Reporta el primer fallo, qué corregir, y NO permitas el commit hasta que se resuelva.
