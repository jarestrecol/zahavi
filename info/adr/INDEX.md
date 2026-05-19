# Índice de ADRs — Zahavi

Architecture Decision Records (ADRs) documentan decisiones arquitectónicas importantes del proyecto. Cada ADR incluye contexto, alternativas consideradas, decisión final, y consecuencias.

Formato: `YYYYMMDD-titulo.md` (fecha de decisión + slug corto).

---

## ADRs vigentes

| # | Fecha | Título | Estado | Categoría |
|---|---|---|---|---|
| [ADR-0001](./0001-arquitectura-hexagonal-y-bounded-contexts.md) | 2026-05-05 | Arquitectura Hexagonal y Bounded Contexts | Aceptado | Arquitectura |
| [ADR-0002](./20260513-acl-cross-bc-escandallo.md) | 2026-05-13 | Patrón ACL cross-BC para CalcularEscandallo | Aceptado | Arquitectura, Integración cross-BC |
| [ADR-0003](./20260513-business-unit-id-from-jwt.md) | 2026-05-13 | businessUnitId derivado del JWT | Aceptado (RLS defense-in-depth: D-011) | Seguridad, Autorización |

---

## Roadmap de ADRs pendientes

Estos ADRs están por crear:

- **ADR-0004: Manejo de Domain Events** — Persistencia, event handlers, transacciones distribuidas.
- **ADR-0005: Offline-First en cliente (SQLite + sincronización)** — Adaptador de persistencia local, idempotencia, conflictos.
- **ADR-0006: Zero-Trust en detalle** — RLS policies, JWT validation, auditoría con hash encadenado.
- **ADR-0007: Notificaciones y messaging** — Real-time (Supabase Realtime vs. WebSockets), sidecars de procesamiento.
- **ADR-0008: Monitoreo y observabilidad** — OpenTelemetry, tracing, alertas de negocio.

---

## Cómo usar este índice

1. **Para buscar una decisión:** Lee el índice, encuentra el tema, abre el ADR.
2. **Para entender arquitectura:** Empieza con **ADR-0001** (fundamentos).
3. **Para revisar un PR que toca arquitectura:** Invoca al subagente `architect-guardian` — validará contra estos ADRs.
4. **Para crear un nuevo ADR:** Copia la plantilla de `ADR-0001`, llena los campos, coloca en esta carpeta con formato `YYYYMMDD-titulo.md`, y actualiza este índice.

---

## Plantilla de ADR

```markdown
# ADR-NNNN: <Título en lenguaje claro>

- **Estado:** [Propuesta | Aceptada | Reemplazada por ADR-XXXX | Deprecada]
- **Fecha:** YYYY-MM-DD
- **Decisores:** Julian Restrepo (SUPERADMIN) + [otros]
- **Categoría:** [Arquitectura | Seguridad | Operación | Testing | etc.]
- **Relevancia:** [Crítica | Alta | Media | Baja]

---

## Contexto y problema

<Descripción clara del problema. ¿Por qué surge la necesidad? ¿Qué fuerzas operan? ¿Qué restricciones existen?>

---

## Opciones consideradas

### 1. <Opción A>
**Descripción:** ...
**Pros:** ...
**Contras:** ...

### 2. <Opción B>
...

---

## Decisión

<En lenguaje claro, qué se decidió y por qué.>

---

## Consecuencias

### Positivas
- ...

### Negativas / Trade-offs
- ...

### Riesgos a monitorear
- ...

---

## Referencias

- <Enlaces internos y externos>

---

## Aprobación

- ✅ Aceptado por ... — YYYY-MM-DD
```

---

## Notas de proceso

- Toda decisión arquitectónica **relevante** (que afecte múltiples componentes o el futuro) se documenta en un ADR.
- Un ADR puede ser reemplazado (nunca eliminado). Si una decisión cambia, se crea uno nuevo que dice "Reemplaza ADR-XXXX" y el viejo se marca "Reemplazada por ADR-YYYY".
- ADRs son de lectura; la implementación va en el código. No dupliques aquí lo que ya está documentado en runbooks o domain model.
