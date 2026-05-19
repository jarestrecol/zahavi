---
description: Audita la pureza arquitectónica del proyecto. Invoca al architect-guardian.
argument-hint: "[ruta opcional, ej: packages/domain/inventory]"
allowed-tools: Read, Grep, Glob, Bash, Task
---

Invoca al subagente **architect-guardian** para auditar la arquitectura del proyecto Zahavi.

Si el usuario indicó una ruta en `$ARGUMENTS`, audita esa ruta. Si no, audita los archivos cambiados (`git diff --name-only HEAD`).

El subagente debe verificar:
1. Pureza del dominio (sin imports externos en `packages/domain/**`).
2. Dirección de dependencias (siempre hacia adentro).
3. Aislamiento entre bounded contexts.
4. Inmutabilidad de entidades y VOs.
5. Cumplimiento de SOLID en clases nuevas/modificadas.

Reporta resultado con formato del agente.
