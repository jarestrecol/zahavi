---
description: Añade un caso de uso al bounded context indicado, con tests TDD.
argument-hint: "<bc> <NombreDelCasoDeUso> (ej: production EjecutarOrdenDeProduccion)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

Crea un nuevo caso de uso en el bounded context indicado, con TDD estricto.

Argumentos: `$ARGUMENTS` debe ser `<bc> <NombreCasoUso>`.

Pasos:

1. **Validar** que el BC existe en `packages/domain/<bc>/`. Si no, sugiere correr `/new-bounded-context` primero.

2. **Identificar puertos requeridos** por el caso de uso (repositorios, servicios). Crearlos en `packages/ports/<bc>/` si no existen.

3. **Escribir tests primero** en `packages/application/<bc>/__tests__/<nombre-caso-uso>.spec.ts`:
   - Caso happy path.
   - Cada error de dominio esperado.
   - Eventos de dominio que debe emitir.
   - Llamadas a puertos que debe hacer (con dobles).

4. **Implementar el caso de uso** en `packages/application/<bc>/<nombre-caso-uso>.ts` para que pasen los tests.

5. **Invocar al test-engineer** para validar cobertura y calidad de tests.

6. **Invocar al architect-guardian** para validar pureza.

7. **Reportar**: archivos creados, tests pasados, cobertura, próximos pasos (adaptador concreto, endpoint HTTP, vista UI).

Recuerda: el caso de uso NO debe importar nada de `packages/adapters/` ni de framework alguno. Solo `domain` + `ports` + `shared`.
