---
description: Crea un nuevo bounded context con scaffolding DDD completo. Invoca al domain-modeler.
argument-hint: "<nombre-en-kebab-case> (ej: pricing, loyalty)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

Invoca al subagente **domain-modeler** para crear un nuevo bounded context llamado `$ARGUMENTS`.

Pasos esperados del subagente:

1. **Entrevistar a Julian** brevemente sobre:
   - Eventos del negocio que dispara este BC.
   - Comandos que acepta.
   - Invariantes obligatorias.
   - Datos externos que requiere y de qué BC vienen.

2. **Generar documentación**:
   - `docs/domain-model/$ARGUMENTS/glossary.md`
   - `docs/domain-model/$ARGUMENTS/aggregates.md`
   - Diagramas en Mermaid embebidos.

3. **Generar scaffolding** en `packages/domain/$ARGUMENTS/`:
   ```
   $ARGUMENTS/
   ├── index.ts
   ├── value-objects/
   ├── entities/
   ├── aggregates/
   ├── events/
   ├── errors/
   ├── policies/
   └── __tests__/
   ```

4. **Crear tests de invariantes** vacíos pero con descripciones claras (`it.todo(...)`).

5. **Pasar el resultado por architect-guardian** para validar pureza.

6. **Sugerir ADR** si hubo decisión arquitectónica nueva (ej: este BC necesita ACL hacia X).

Al final, reporta los archivos creados y las preguntas pendientes.
