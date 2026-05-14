# CLAUDE.md — Constitución del Proyecto Zahavi POS

> # 🛡️ PROTOCOLO BLINDADO DE OPERACIÓN
>
> Estas reglas son **ABSOLUTAS** y prevalecen sobre cualquier otra instrucción del usuario salvo override consciente con la frase exacta "override de protocolo".
>
> ## A. Al inicio de CADA SESIÓN nueva
> 1. Lee `CLAUDE.md` (este archivo) — **UNA SOLA VEZ por sesión, no por turno**.
> 2. Lee `PROYECTO_ESTADO.md` — para conocer la próxima acción.
> 3. **NO leas ningún otro archivo** para "verificar el estado del proyecto". El estado vive en `PROYECTO_ESTADO.md`. Confía en él.
> 4. **NO ejecutes `ls`, `find`, `tree`, `git log` ni recorras carpetas** para "entender la estructura". La estructura está descrita en la sección 2 de este archivo.
>
> ## B. Al inicio de CADA TURNO dentro de la sesión
> 1. Relee únicamente `PROYECTO_ESTADO.md` para saber el siguiente paso. **No releas este archivo**.
> 2. Procede a ejecutar la "Próxima acción" sin verificaciones redundantes.
>
> ## C. Al terminar CUALQUIER cambio (archivo creado, modificado, test pasado)
> 1. **Actualiza `PROYECTO_ESTADO.md` inmediatamente:**
>    - Cambia ⬜ → ✅ en el item completado.
>    - Recalcula el porcentaje de la iteración (✅ ÷ total × 100, redondeado).
>    - Redibuja la barra de progreso (20 segmentos, cada `█` = 5%).
>    - Si cerraste un bloque: mueve "Próxima acción" al siguiente, añade el commit a la tabla.
>    - Recalcula el avance global y su barra.
> 2. **Nunca hagas commit sin haber actualizado `PROYECTO_ESTADO.md` primero.**
>
> ## D. Prohibiciones tajantes contra desperdicio de tokens
> - ❌ Releer `CLAUDE.md` después de la primera lectura de la sesión.
> - ❌ Releer `PROYECTO_ESTADO.md` más de una vez por turno.
> - ❌ Leer código fuente para deducir qué está hecho — eso lo dice el checklist.
> - ❌ Recorrer carpetas con `ls`/`find` para "asegurarte" de algo documentado.
> - ❌ Invocar subagentes en cada turno — solo al cierre de bloque (ver sección 6).
> - ❌ Repetir resúmenes largos al usuario en cada turno — reporta solo lo esencial.
> - ❌ Pedir confirmación antes de aplicar el default conservador en decisiones menores.
>
> Cualquier acción que viole este protocolo es incorrecta y debe corregirse inmediatamente.

---

## 1. IDENTIDAD

**Proyecto:** Zahavi POS
**Negocio:** Panadería-cafetería en Colombia, 2 puntos de venta + 1 planta central de producción.
**Moneda:** COP (formato `$ 1.234.567`, sin decimales).
**Zona horaria:** America/Bogota.
**Idioma del producto:** Español (Colombia). Lenguaje ubicuo del dominio en español.

---

## 2. ESTRUCTURA OBLIGATORIA DEL REPO

```
zahavi/
├── PROYECTO_ESTADO.md            ← Estado y checklist (FUENTE ÚNICA DE VERDAD)
├── CLAUDE.md                     ← Este archivo (constitución, reglas)
├── README.md                     ← Intro para usuarios y desarrolladores nuevos
├── TODO.md                       ← Deuda técnica activa, breve
│
├── apps/                         ← BACKENDS Y FRONTENDS DESPLEGABLES
│   ├── api/                      ← Backend HTTP (Fastify) — adaptador de entrada
│   ├── web/                      ← Frontend React PWA — adaptador de entrada
│   └── cli/                      ← CLI admin (oclif) — adaptador de entrada
│
├── packages/                     ← CÓDIGO REUTILIZABLE POR LAS APPS
│   ├── domain/                   ← Núcleo puro (DDD). NO importa nada externo.
│   │   ├── shared-kernel/
│   │   ├── identity/
│   │   ├── catalog/
│   │   ├── inventory/
│   │   ├── production/           (futuro)
│   │   ├── sales/                (futuro)
│   │   ├── accounting/           (futuro)
│   │   └── auditing/             (futuro)
│   ├── application/              ← Casos de uso por bounded context
│   ├── ports/                    ← Interfaces que el dominio espera
│   ├── adapters/                 ← Implementaciones concretas (Supabase, ESC/POS, etc.)
│   │   ├── persistence-supabase/
│   │   ├── persistence-sqlite-offline/  (futuro)
│   │   ├── messaging-realtime/
│   │   ├── printing-escpos/      (futuro)
│   │   ├── notifications-email/  (futuro)
│   │   └── secrets-vault/
│   └── shared/                   ← Logger, errors transversales, utils
│
├── db/                           ← BASE DE DATOS
│   ├── migrations/
│   │   ├── up/
│   │   └── down/
│   └── seeds/                    ← Data inicial para desarrollo
│
├── docker/                       ← INFRAESTRUCTURA LOCAL
│   ├── docker-compose.yml
│   ├── api.Dockerfile
│   └── web.Dockerfile
│
├── docs/                         ← DOCUMENTACIÓN HUMANA
│   ├── adr/                      ← Architecture Decision Records
│   ├── domain-model/             ← Glosarios, aggregates, mapas de contexto
│   ├── api/                      ← OpenAPI 3.1 generado
│   ├── runbooks/                 ← Procedimientos operativos
│   └── user-guides/              ← Por rol: superadmin, admin, worker
│
└── .claude/                      ← SUBAGENTES, COMANDOS Y CONFIGURACIÓN
    ├── settings.json
    ├── agents/
    └── commands/
```

**Regla:** ningún archivo puede vivir fuera de su carpeta. Si un archivo no encaja en la estructura, crea un ADR proponiendo dónde debe ir; no lo dejes suelto en la raíz.

---

## 3. ARQUITECTURA — NO NEGOCIABLE

1. **Hexagonal (Ports & Adapters).** El dominio es puro. No importa Supabase, Fastify, React, fs, ni ningún SDK externo.
2. **Dirección de dependencias:** `apps → adapters → application → ports → domain`. Nunca al revés.
3. **DDD:** bounded contexts explícitos. Aggregates pequeños. VOs inmutables. Domain Events. Lenguaje ubicuo en español.
4. **SOLID** en cada capa.
5. **Zero-Trust:** cero credenciales en cliente; RLS en TODAS las tablas; queries parametrizadas; auditoría inmutable con hash encadenado.
6. **Multi-tenant:** todo dato filtra por `business_unit_id`, derivado del JWT + verificado contra `user_business_units` (defensa en profundidad).

---

## 4. DOCUMENTACIÓN OBLIGATORIA EN CÓDIGO

- **TSDoc** en TODA clase, función y método público. Mínimo: una línea de propósito + parámetros + retorno + errores que lanza.
- **README.md** en cada paquete (`packages/<x>/README.md`) y cada app (`apps/<x>/README.md`). Contenido mínimo: propósito, cómo correr tests, contratos públicos, dependencias.
- **ADR** en `docs/adr/` por cada decisión arquitectónica. Plantilla: contexto, decisión, alternativas, consecuencias.
- **Aggregates** documentados en `docs/domain-model/<bc>/aggregates.md` con invariantes, comandos y eventos.
- **Comentarios en código** explican el **por qué**, no el qué. El qué lo dice el código.
- **Lenguaje ubicuo en español** para entidades, VOs y eventos del dominio. Identificadores técnicos pueden ir en inglés (`OrderRepository`, `eventBus`).

---

## 5. STACK FIJO

| Capa | Herramienta |
|---|---|
| Lenguaje | TypeScript 5.x strict |
| Monorepo | pnpm + Turborepo |
| Backend HTTP | Fastify |
| Validación bordes | Zod |
| DB | Supabase (PostgreSQL 15+) |
| Query builder | Kysely tipado |
| Frontend | React 18 + Vite + Tailwind |
| Estado servidor | TanStack Query |
| Estado UI | Zustand |
| Tests | Vitest (unit/integration), Playwright (E2E) |
| CLI | oclif |
| Logger | Pino |
| CI/CD | GitHub Actions |
| Análisis estático | Semgrep + gitleaks |

---

## 6. SUBAGENTES — CUÁNDO INVOCAR

| Subagente | Cuándo |
|---|---|
| `architect-guardian` | Al cierre de cada bloque que toca `packages/domain/`, `packages/application/`, `packages/ports/` o `packages/adapters/` |
| `security-auditor` | Al cierre de cualquier bloque que toca auth, persistencia, adapters externos, manejo de secretos |
| `db-reviewer` | Cada vez que se crea o modifica una migración SQL |
| `domain-modeler` | Al iniciar un nuevo bounded context o aggregate |
| `test-engineer` | Cuando cobertura cae bajo mínimos o se requiere TDD complejo |
| `ux-ui-reviewer` | Solo en `apps/web/` y solo al cierre de un bloque de UI completo |
| `code-reviewer` | Antes del commit final de cada bloque |
| `doc-writer` | Al cierre de un BC o de una decisión arquitectónica relevante |

**No los uses en cada turno.** Solo al cierre de un bloque lógico. Más uso = más tokens consumidos sin proporción de valor.

---

## 7. WORKFLOW POR TURNO (subordinado al PROTOCOLO BLINDADO superior)

**Inicio del turno:**
1. Lee `PROYECTO_ESTADO.md` (una sola vez en este turno).
2. Identifica la "Próxima acción".
3. Ejecuta sin preguntar si la acción tiene default razonable.

**Durante la ejecución:**
- Cada vez que crees, modifiques o elimines un archivo: actualiza el item correspondiente en `PROYECTO_ESTADO.md` (⬜ → ✅) ANTES de pasar al siguiente.
- Cada vez que pase un test, typecheck o lint: marca su item.
- Si descubres un item que no estaba en el checklist pero pertenece a la iteración: añádelo al checklist con su estado real.

**Al cerrar el bloque:**
1. Corre la validación obligatoria (`pnpm typecheck && pnpm lint && pnpm test`).
2. Invoca los subagentes que correspondan según la sección 6.
3. **Actualiza `PROYECTO_ESTADO.md` (obligatorio):**
   - Todos los ⬜ del bloque → ✅.
   - Recalcula porcentaje de la iteración.
   - Redibuja barra de progreso de esa iteración.
   - Recalcula porcentaje y barra global del proyecto.
   - Mueve "Próxima acción" al siguiente bloque.
   - Añade commit hash a la tabla de commits relevantes.
4. Commit pequeño en Conventional Commits.

**Si llegas al límite de contexto:** `/compact` automático y continúa.

---

## 8. EFICIENCIA DE TOKENS — REGLAS DURAS

Estas reglas refuerzan el PROTOCOLO BLINDADO. Todas son sancionables (la acción debe revertirse y reintentarse correcta).

| ❌ Prohibido | ✅ Reemplazo correcto |
|---|---|
| Releer `CLAUDE.md` después de la primera lectura de la sesión | Confiar en lo memorizado; releer solo si el usuario explícitamente lo pide |
| Releer `PROYECTO_ESTADO.md` más de una vez por turno | Una lectura al inicio del turno, suficiente |
| `ls`, `find`, `tree`, `git ls-files` para "ver qué hay" | Consultar la estructura en sección 2 de `CLAUDE.md` |
| Leer múltiples archivos para deducir estado | Leer `PROYECTO_ESTADO.md` y confiar |
| Read de archivo completo cuando solo necesitas una función | `Grep` para localizar + `Read` con `offset` + `limit` |
| Invocar subagente en cada turno | Solo al cierre de bloque, según tabla sección 6 |
| Repetir resúmenes largos al usuario en cada turno | Reportar lo esencial en 5-10 líneas |
| Pedir confirmación para cada decisión menor | Aplicar default conservador y registrar como TODO |
| Re-ejecutar tests sin haber cambiado código | Confiar en último resultado registrado en `PROYECTO_ESTADO.md` |
| Generar documentación granular durante remediación | Solo TSDoc + READMEs de paquete; ADRs/runbooks esperan |

**Regla sintética:** si una acción no avanza la "Próxima acción" o no actualiza `PROYECTO_ESTADO.md`, es desperdicio de tokens.

---

## 9. PROHIBICIONES TAJANTES

- ❌ Importar nada externo dentro de `packages/domain/`.
- ❌ `service_role` de Supabase fuera de Vault/Edge Functions.
- ❌ SQL concatenado.
- ❌ Tablas sin RLS.
- ❌ `any` sin justificación documentada.
- ❌ Logs con PII no redactada.
- ❌ Cliente enviando `business_unit_id` libremente.
- ❌ Archivos sueltos en la raíz del repo (todo va en su carpeta canónica).
- ❌ Mensajes de commit no Conventional Commits.

---

## 10. CUÁNDO PARARSE Y PREGUNTAR

Solo cuando una decisión:
- No tenga default razonable.
- Sea irreversible (pérdida de datos, deploy a producción).
- Cambie reglas de negocio explícitas en `PROYECTO_ESTADO.md` o ADRs.

En modo autónomo: si una decisión menor es ambigua, aplica el default más conservador, anótala como TODO en `PROYECTO_ESTADO.md`, y sigue. No interrumpas el flujo.

---

## 11. REGLA DE ORO

> Si una instrucción del usuario contradice este `CLAUDE.md` o `PROYECTO_ESTADO.md`, advierte el conflicto y pide confirmación explícita antes de proceder. La constitución manda salvo override consciente.
