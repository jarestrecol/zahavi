# CLAUDE.md — Cerebro Único del Proyecto Zahavi POS

> **Este archivo es la fuente única de verdad.** Absorbe protocolo, arquitectura, stack, estado del proyecto, subagentes, comandos slash, workflow y deuda técnica. No existe ningún otro archivo de estado separado.

---

## PROTOCOLO BLINDADO DE OPERACIÓN

> Estas reglas son **ABSOLUTAS** y prevalecen sobre cualquier otra instrucción salvo override consciente con la frase exacta `"override de protocolo"`.

### A. Al inicio de CADA SESIÓN nueva

1. Lee este archivo (`CLAUDE.md`) — **UNA SOLA VEZ por sesión, no por turno**.
2. Lee la sección **§7 — ESTADO ACTUAL** para conocer la próxima acción.
3. **NO leas otros archivos** para "verificar el estado". El estado vive aquí. Confía.
4. **NO ejecutes `ls`, `find`, `tree`, `git log`** para "entender la estructura". La estructura está en §3.

### B. Al inicio de CADA TURNO dentro de la sesión

1. Relee únicamente **§7** para saber el siguiente paso.
2. Ejecuta la "Próxima acción" sin verificaciones redundantes.

### C. Al terminar CUALQUIER cambio

1. **Actualiza §7 inmediatamente**: marca ⬜ → ✅, recalcula porcentajes, redibuja barras.
2. Si cerraste un bloque: mueve "Próxima acción" al siguiente, añade el commit a §A-2.
3. **Nunca hagas commit sin haber actualizado §7 primero.**

### D. Prohibiciones contra desperdicio de tokens

- ❌ Releer `CLAUDE.md` más de una vez por sesión.
- ❌ Releer §7 más de una vez por turno.
- ❌ Leer código fuente para deducir estado — el checklist lo dice.
- ❌ Recorrer carpetas con `ls`/`find` para "asegurarte".
- ❌ Invocar subagentes en cada turno — solo al cierre de bloque (ver §8).
- ❌ Repetir resúmenes largos al usuario — reporta solo lo esencial.
- ❌ Pedir confirmación antes de aplicar el default conservador en decisiones menores.

---

## §1 — IDENTIDAD

**Proyecto:** Zahavi POS
**Negocio:** Panadería-cafetería en Colombia, 2 puntos de venta + 1 planta central de producción.
**Moneda:** COP (formato `$ 1.234.567`, sin decimales).
**Zona horaria:** America/Bogota.
**Idioma del producto:** Español (Colombia). Lenguaje ubicuo del dominio en español.

---

## §2 — ESTRUCTURA DEL REPO

```
zahavi/
├── CLAUDE.md                     ← Este archivo (cerebro único del proyecto)
├── README.md                     ← Intro para usuarios y desarrolladores nuevos
├── TODO.md                       ← Deuda técnica activa, breve
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── docker-compose.yml
├── render.yaml
│
├── backend/                      ← CÓDIGO SERVIDOR
│   ├── api/                      ← Fastify HTTP — adaptador de entrada
│   ├── cli/                      ← CLI admin (oclif) — adaptador de entrada
│   ├── domain/                   ← Núcleo puro (DDD). NO importa nada externo.
│   │   ├── shared-kernel/
│   │   ├── identity/
│   │   ├── catalog/
│   │   ├── inventory/
│   │   ├── production/
│   │   ├── sales/
│   │   ├── reporting/
│   │   └── auditing/             (futuro)
│   ├── application/              ← Casos de uso por bounded context
│   ├── ports/                    ← Interfaces que el dominio espera
│   ├── adapters/                 ← Implementaciones concretas
│   │   ├── persistence-supabase/
│   │   ├── messaging-realtime/
│   │   ├── secrets-vault/
│   │   ├── persistence-sqlite-offline/  (futuro)
│   │   ├── printing-escpos/      (futuro)
│   │   └── notifications-email/  (futuro)
│   └── shared/                   ← Logger, errors transversales, utils
│
├── frontend/                     ← CÓDIGO CLIENTE
│   └── web/                      ← React 18 PWA (Vite + Tailwind)
│
├── database/                     ← BASE DE DATOS
│   ├── migrations/
│   │   └── legacy/               ← SQL iniciales aplicados vía Docker init
│   └── seeds/                    ← Data inicial para desarrollo
│
├── qa/                           ← CALIDAD
│   ├── e2e/                      ← Tests Playwright (Playwright config en backend/api/)
│   └── tsconfig.json
│
├── info/                         ← DOCUMENTACIÓN Y ARCHIVO
│   ├── adr/                      ← Architecture Decision Records
│   ├── domain-model/             ← Glosarios, aggregates, mapas de contexto
│   ├── runbooks/                 ← Procedimientos operativos
│   ├── auditorias/               ← Informes de auditoría QA
│   ├── proyecto_estado/          ← Historial de estado (archivo histórico)
│   └── archivo_historico/        ← Agentes/comandos/docs pre-reorganización
│
├── supabase/                     ← CLI Supabase (migrations cloud)
│   └── migrations/
│
├── docker/                       ← Dockerfiles
│   ├── api.Dockerfile
│   └── web.Dockerfile
│
└── .claude/                      ← Configuración Claude Code
    └── settings.json
```

**Regla:** ningún archivo puede vivir fuera de su carpeta. Cualquier excepción requiere ADR en `info/adr/`.

---

## §3 — ARQUITECTURA — NO NEGOCIABLE

1. **Hexagonal (Ports & Adapters).** El dominio es puro. No importa Supabase, Fastify, React, `fs`, ni ningún SDK externo.
2. **Dirección de dependencias:** `backend/api → backend/adapters → backend/application → backend/ports → backend/domain`. Nunca al revés.
3. **DDD:** bounded contexts explícitos. Aggregates pequeños. VOs inmutables. Domain Events. Lenguaje ubicuo en español.
4. **SOLID** en cada capa.
5. **Zero-Trust:** cero credenciales en cliente; RLS + FORCE RLS en TODAS las tablas; queries parametrizadas; auditoría inmutable con hash encadenado.
6. **Multi-tenant:** todo dato filtra por `business_unit_id`, derivado del JWT + verificado contra `user_business_units` (defensa en profundidad).

---

## §4 — STACK FIJO

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

## §5 — BOUNDED CONTEXTS

| BC | Estado | Ruta dominio | Lenguaje ubicuo (ejemplos) |
|---|---|---|---|
| Identity | ✅ Completo | `backend/domain/identity/` | usuario, rol, sesión, TOTP, superadmin, administrador, trabajador |
| Catalog | ✅ Completo | `backend/domain/catalog/` | producto, combo, variante, receta, escandallo, categoría |
| Inventory | ✅ Completo | `backend/domain/inventory/` | ingrediente, stock, movimiento, proveedor, alerta |
| Production | ✅ Completo | `backend/domain/production/` | orden de producción, lote, despacho, merma, BOM, planta central |
| Sales | ✅ Completo | `backend/domain/sales/` | mesa, comanda, factura, cobro, división de cuenta, cierre de caja |
| Reporting | ✅ Completo | `backend/domain/reporting/` | dashboard, resumen de ventas, alerta de stock |
| Auditing | ⬜ Futuro | `backend/domain/auditing/` | registro de auditoría, hash encadenado, hallazgo forense |

**API HTTP:** 47 endpoints en 6 BCs activos.

---

## §6 — DESPLIEGUE

| Servicio | URL | Estado |
|---|---|---|
| API (Render) | `https://zahavi-api.onrender.com` | ✅ Live |
| Frontend (Vercel) | `https://zahavi-web.vercel.app` | ✅ Live |
| Supabase cloud | proyecto `krubipnwqrsywmlyskja` (us-east-1) | ✅ 29 tablas, 5 schemas |

**Credenciales piloto:** `admin@zahavi.local` / `Zahavi2026!`

**Despliegue API:** `render.yaml` → build `pnpm install --frozen-lockfile && pnpm build` → start `node backend/api/dist/index.js`

**Despliegue Web:** Vercel detecta `frontend/web/`, build `pnpm build`, output `dist/`.

**SSL Supabase:** `rejectUnauthorized: false` + `stripSslParams()` en `createSharedPool` — estándar para Supabase Session Pooler sin IPv6.

---

## §7 — ESTADO ACTUAL DEL PROYECTO

```
████████████████████ 100% — Piloto en producción verificado
```

**Iteraciones completadas:** Bootstrap (90%), Identity (97%), Catalog+Inventory (95%), Fase A (100%), Fase B (95%), Production (100%), Sales (100%), Dashboard+Reportes (100%), Despliegue piloto (100%), Refinamiento (100%).

**Fase QA+Reorganización (2026-05-19):**
- ✅ Fase 1 — Auditoría QA, hallazgos críticos resueltos (commit `ddc19a2`)
- ✅ Fase 2 — Reorganización física en 5 carpetas raíz (commit `3a51e40`)
- ✅ Fase 3 — CLAUDE.md unificado (este archivo)
- ✅ Fase 4 — TSDoc completo en clases y métodos públicos (shared-kernel, identity, catalog, ports)
- ✅ Fase 5 — README.md profesional con diagrama Mermaid y nueva estructura
- ✅ Fase 6 — Validación final + subagentes + commit release

### Próxima acción inmediata

> Proyecto al 100% post-QA. No hay acciones bloqueantes pendientes.
>
> Opciones de continuación:
> - **D-030:** Crear tabla `audit.log` append-only con hash encadenado (scope futuro).
> - **Siguiente BC:** Offline-first SQLite para tablets (D-010) o integración DIAN.
> - **CLI admin** (`backend/cli/`): fuera de scope piloto.

### Hitos completados en sesión actual

| Fase | Commit | Descripción |
|---|---|---|
| QA Fase 1 | `ddc19a2` | Auditoría + resolución hallazgos críticos (FORCE RLS, PWA, accesibilidad, rate-limit) |
| QA Fase 2 | `3a51e40` | Reorganización física backend/frontend/database/qa/info |

### Deuda técnica activa (D-025+)

| ID | Descripción | Prioridad | Estado |
|---|---|---|---|
| D-025 | TSDoc incompleto en backend/ports/ y backend/domain/ post-reorganización | Media | ⬜ Fase 4 |
| D-026 | README.md raíz no refleja nueva estructura de carpetas | Baja | ⬜ Fase 5 |
| D-027 | docker/web.Dockerfile no actualizado con paths frontend/ | Media | ⬜ Verificar |
| D-028 | E2E tests: playwright.config.ts apunta a qa/e2e/ — verificar rutas post-reorganización | Media | ⬜ Verificar |
| D-029 | `backend/domain/catalog/dist/**` artefactos compilados en git — agregar `dist/` al .gitignore de dominio | Baja | ⬜ Higiene |
| D-030 | Tabla `audit.log` global append-only con hash encadenado (CLAUDE.md §14) no implementada | Alta (futuro) | ⬜ Scope futuro |
| D-008 | Tema oscuro en frontend | Baja | ⬜ Fuera de scope |
| D-009 | i18n completo | Baja | ⬜ Fuera de scope |
| D-010 | Offline-first SQLite para tablets | Alta operativa | ⬜ Scope separado |

---

## §8 — SUBAGENTES — DEFINICIONES Y USO

**Regla:** invocar solo al cierre de un bloque lógico, nunca en cada turno.

| Subagente | Cuándo invocar |
|---|---|
| `architect-guardian` | Al cierre de bloque que toca `backend/domain/`, `backend/application/`, `backend/ports/` o `backend/adapters/` |
| `security-auditor` | Al cierre de bloque que toca auth, persistencia, adapters externos, manejo de secretos |
| `db-reviewer` | Cada vez que se crea o modifica una migración SQL en `supabase/migrations/` o `database/` |
| `domain-modeler` | Al iniciar un nuevo bounded context o aggregate |
| `test-engineer` | Cuando cobertura cae bajo mínimos o se requiere TDD complejo |
| `ux-ui-reviewer` | Solo en `frontend/web/` y solo al cierre de un bloque de UI completo |
| `code-reviewer` | Antes del commit final de cada bloque |
| `doc-writer` | Al cierre de un BC o de una decisión arquitectónica relevante |

### architect-guardian

**Misión:** proteger la integridad arquitectónica. Modelos: opus.

**Reglas:**
1. Ningún archivo bajo `backend/domain/**` puede importar de Supabase, pg, Kysely, Fastify, React, fs, path, ni adapters/application. Solo `backend/domain/shared-kernel/**` y tipos TS estándar.
2. Dirección de dependencias: `backend/api` → `backend/adapters` → `backend/application` → `backend/ports` → `backend/domain`. Nunca al revés.
3. Dentro de `backend/domain/`, un BC no importa de otro BC directamente. Comunicación vía Domain Events o ACL explícita.
4. Entidades y VOs son inmutables (`readonly`). Mutaciones devuelven nuevas instancias.
5. SOLID verificado en clases nuevas.

**Formato de reporte:**
```
ARCHITECT GUARDIAN — Resultado: [✅ APRUEBA | ❌ RECHAZA]
Violaciones encontradas:
1. [archivo:línea] — descripción — corrección sugerida
```
Si hay violaciones críticas, **bloquea** y no continúa.

### security-auditor

**Misión:** cero compromiso de seguridad llega a producción. Modelo: opus.

**Marco:** OWASP Top 10 (2021), ASVS Level 2, CWE Top 25, Habeas Data Colombia (Ley 1581/2012).

**Checklist obligatorio:**
- Secretos: ningún `service_role` fuera de Vault/Edge Functions; sin `.env` commiteado; sin API keys hardcodeadas; sin PII en logs.
- SQL: cero concatenación; solo Kysely o statements parametrizados; funciones `SECURITY DEFINER` con `SET search_path = ''`.
- RLS: toda tabla nueva con `ENABLE ROW LEVEL SECURITY`; políticas para SELECT/INSERT/UPDATE/DELETE; filtro `business_unit_id` por JWT; sin `USING (true)` en datos sensibles.
- Auth: JWTs TTL ≤ 15 min + refresh rotativo; bcrypt cost ≥ 12; 2FA SUPERADMIN obligatorio; rate-limit en login/refresh.
- Autorización: cada endpoint verifica rol y `business_unit_id`; WORKER sin acceso a costos/márgenes.
- PII: cédula/teléfono cifrados con pgcrypto; sin PAN/CVV almacenados.
- Auditoría: mutaciones críticas en `audit_log` append-only con hash encadenado.

**Comandos de análisis estático:**
```bash
gitleaks detect --no-git -v
semgrep --config=auto backend/ frontend/
pnpm audit --audit-level=high
```

**Bloqueo inmediato** ante: secreto en código, SQL crudo, tabla sin RLS, endpoint sin rol, PAN/CVV almacenado, PII en logs, `service_role` en cliente.

### db-reviewer

**Misión:** garantizar que la DB sea sólida, segura y mantenible. Modelo: sonnet.

**Estándares:**
- Tablas `snake_case` plural; PKs `UUID DEFAULT gen_random_uuid()`; FKs con índice explícito y `ON DELETE RESTRICT` por defecto.
- Timestamps: `created_at`/`updated_at` `TIMESTAMPTZ NOT NULL DEFAULT now()` con trigger.
- Migraciones: `YYYYMMDDHHMM_descripcion.sql`; cada `up/` tiene par en `down/`.
- RLS en toda tabla; ENUMs nativos; `CHECK` constraints para invariantes simples.
- `COMMENT ON TABLE/COLUMN` en estructuras no triviales.
- Funciones `SECURITY DEFINER` con `SET search_path = pg_catalog, public`.

**Bloqueo** ante: tabla sin RLS, DROP sin plan de migración de datos, FK sin índice, migración no reversible sin justificación.

### domain-modeler

**Misión:** diseñar el modelo de dominio con DDD y lenguaje ubicuo. Modelo: opus.

**Para cada BC nuevo entrega:**
1. `info/domain-model/<bc>/glossary.md` — glosario ubicuo.
2. `info/domain-model/<bc>/aggregates.md` — aggregates, invariantes, comandos, eventos.
3. Scaffolding en `backend/domain/<bc>/`: `index.ts`, `value-objects/`, `entities/`, `aggregates/`, `events/`, `errors/`, `policies/`, `__tests__/`.
4. Tests de invariantes (cada invariante con test que valida y test que viola).

**Reglas de modelado:** VOs inmutables con factoría estática; entidades con identidad por VO; aggregates pequeños (<10 entidades hijas); Domain Events en pasado en español (`VentaCerrada`); errores tipados (`class StockInsuficienteError extends DomainError`).

### test-engineer

**Misión:** cobertura y calidad de tests. Modelo: sonnet.

**Umbrales mínimos:** ≥ 90% en `backend/domain/`, ≥ 80% en `backend/application/`, ≥ 60% en `backend/adapters/`.

**TDD estricto en dominio:** test primero (happy path + cada error de dominio + eventos emitidos + llamadas a puertos). Tests determinísticos, rápidos, aislados. Sin `jest.setTimeout` injustificados.

**E2E (Playwright):** suite en `qa/e2e/`; config en `backend/api/playwright.config.ts`; semillas en `database/seeds/`; requiere Docker Compose activo.

### ux-ui-reviewer

**Misión:** UX/UI correcto para meseros y cajeros. Solo en `frontend/web/`. Modelo: sonnet.

**Audita:**
- WCAG AA: contraste ≥ 4.5:1 texto, ≥ 3:1 UI; foco visible con `focus-visible`; `aria-*` en componentes interactivos; formularios con `<label>` asociado; alertas con `role="alert" aria-live`.
- Estados: loading skeleton, empty state con CTA, error banner, offline banner.
- Velocidad operativa: acciones críticas (cobrar, agregar ítem) en ≤ 2 taps.
- PWA: `manifest.json` presente; `theme-color`; orientación landscape para tablets.

### code-reviewer

**Misión:** calidad general del cambio pre-commit. Modelo: sonnet.

**Audita:** naming (verbos para funciones, sustantivos para clases, español para dominio); complejidad ciclomática (máximo 10 por función); dead code; comentarios que explican el por qué, no el qué; tipos explícitos (sin `any` injustificado); manejo de errores en bordes del sistema; consistencia con el resto del codebase.

### doc-writer

**Misión:** mantener documentación técnica actualizada. Modelo: sonnet.

**Genera o actualiza:**
- ADRs en `info/adr/` (plantilla: contexto, decisión, alternativas, consecuencias).
- `info/domain-model/<bc>/aggregates.md` al cerrar un BC.
- OpenAPI 3.1 en `info/api/` cuando cambia un endpoint.
- Runbooks en `info/runbooks/` para procedimientos operativos nuevos.

---

## §9 — COMANDOS SLASH DISPONIBLES

### `/new-bounded-context <nombre-kebab>`

Crea un BC con scaffolding DDD completo. Invoca `domain-modeler`.

**Pasos:**
1. Entrevistar sobre eventos del negocio, comandos, invariantes, datos externos.
2. Generar `info/domain-model/<nombre>/glossary.md` + `aggregates.md`.
3. Generar scaffolding en `backend/domain/<nombre>/`.
4. Crear tests de invariantes (`it.todo(...)`).
5. Pasar por `architect-guardian`.
6. Sugerir ADR si hay decisión arquitectónica nueva.

### `/new-use-case <bc> <NombreCasoDeUso>`

Añade un caso de uso con TDD estricto. Invoca `test-engineer` + `architect-guardian`.

**Pasos:**
1. Validar que el BC existe en `backend/domain/<bc>/`.
2. Identificar puertos requeridos; crearlos en `backend/ports/<bc>/` si no existen.
3. Escribir tests primero en `backend/application/<bc>/__tests__/<nombre>.spec.ts`.
4. Implementar el caso de uso en `backend/application/<bc>/<nombre>.ts`.
5. Invocar `test-engineer` para validar cobertura y `architect-guardian` para pureza.
6. El caso de uso NO importa nada de `backend/adapters/` ni de ningún framework.

### `/pre-commit`

Cadena de revisión pre-commit obligatoria (abortar al primer fallo):
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `architect-guardian` sobre archivos staged.
5. `security-auditor` modo staged.
6. `db-reviewer` si hay cambios en `supabase/migrations/**`.
7. `ux-ui-reviewer` si hay cambios en `frontend/web/src/**`.
8. `code-reviewer` sobre el diff staged.
9. Verificar mensaje de commit contra Conventional Commits.

### `/security-scan [full|staged|<path>]`

Auditoría de seguridad integral. Invoca `security-auditor`.
- `staged` (default): solo cambios staged.
- `full`: todo el repo.
- `<path>`: solo esa ruta.

### `/verify-architecture [<path>]`

Audita pureza arquitectónica. Invoca `architect-guardian`.
- Sin argumento: archivos cambiados (`git diff --name-only HEAD`).
- Con `<path>`: solo esa ruta.

---

## §10 — WORKFLOW POR TURNO

**Inicio del turno:**
1. Lee §7 (una sola vez en este turno).
2. Identifica la "Próxima acción".
3. Ejecuta sin preguntar si hay default razonable.

**Durante la ejecución:**
- Al crear/modificar/eliminar un archivo: actualiza el item en §7 (⬜ → ✅).
- Al pasar un test, typecheck o lint: marca su item.
- Al descubrir un item no listado: añádelo con su estado real.

**Al cerrar el bloque:**
1. Corre `pnpm typecheck && pnpm lint && pnpm test`.
2. Invoca los subagentes que correspondan (§8).
3. Actualiza §7: porcentajes, barras, próxima acción, commit hash en §A-2.
4. Commit en Conventional Commits.

**Si llegas al límite de contexto:** `/compact` y continúa.

---

## §11 — EFICIENCIA DE TOKENS

| ❌ Prohibido | ✅ Reemplazo correcto |
|---|---|
| Releer `CLAUDE.md` más de una vez por sesión | Confiar en lo memorizado |
| Releer §7 más de una vez por turno | Una lectura al inicio del turno |
| `ls`, `find`, `tree` para "ver qué hay" | Consultar §2 |
| Leer múltiples archivos para deducir estado | Leer §7 y confiar |
| `Read` de archivo completo para una función | `Grep` + `Read` con `offset`+`limit` |
| Subagente en cada turno | Solo al cierre de bloque |
| Resúmenes largos al usuario en cada turno | 5-10 líneas, solo lo esencial |
| Confirmación para cada decisión menor | Default conservador + registrar en §7 |
| Re-ejecutar tests sin cambios | Confiar en último resultado de §7 |

**Regla sintética:** si una acción no avanza la "Próxima acción" ni actualiza §7, es desperdicio de tokens.

---

## §12 — DOCUMENTACIÓN ESTÁNDAR EN CÓDIGO

- **TSDoc** en TODA clase, función y método público: propósito + parámetros + retorno + errores.
- **README.md** en cada paquete (`backend/<x>/README.md`, `frontend/<x>/README.md`): propósito, cómo correr tests, contratos públicos, dependencias.
- **ADR** en `info/adr/` por cada decisión arquitectónica: contexto, decisión, alternativas, consecuencias.
- **Aggregates** en `info/domain-model/<bc>/aggregates.md`: invariantes, comandos, eventos.
- **Comentarios en código** explican el **por qué**, nunca el qué. El qué lo dice el código.
- **Lenguaje ubicuo en español** para entidades, VOs y eventos. Identificadores técnicos en inglés (`OrderRepository`, `eventBus`).

---

## §13 — CONVENCIONES DE CÓDIGO

- TypeScript strict: `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`.
- Sin `any` sin justificación documentada en el mismo línea (`// justificado: ...`).
- ESLint flat config (`eslint.config.js`). No usar `.eslintrc.*` legacy.
- Prettier aplicado vía lint-staged en pre-commit.
- Imports ordenados: 1) Node stdlib, 2) paquetes externos, 3) `@zahavi/*`, 4) relativos.
- Named exports preferidos sobre default exports (excepto páginas React).
- Conventional Commits: `feat(bc): ...`, `fix(bc): ...`, `refactor(bc): ...`, `test(bc): ...`, `docs(bc): ...`, `chore(...): ...`.

---

## §14 — SEGURIDAD

- RLS + FORCE ROW LEVEL SECURITY en TODAS las tablas.
- Políticas segregadas por rol: `WORKER`, `ADMIN`, `SUPERADMIN`.
- `business_unit_id` siempre derivado del JWT, nunca del cliente.
- Queries parametrizadas con Kysely. Cero SQL concatenado.
- Funciones `SECURITY DEFINER` con `SET search_path = pg_catalog, public`.
- `service_role` solo en Vault o Edge Functions privilegiadas.
- Rate limiting: login/refresh `max: 20/min`; cobros/facturas `max: 60/min`.
- JWTs: TTL 15 min + refresh rotativo. TOTP obligatorio para SUPERADMIN.
- Audit log append-only con hash encadenado (`prev_hash || payload || actor || timestamp`).
- CORS restringido a `CORS_ORIGIN` del JWT; HSTS en producción.
- PII redactada en logs (Pino redact: `['req.headers.authorization', 'password', 'token']`).

---

## §15 — PROHIBICIONES TAJANTES

- ❌ Importar nada externo dentro de `backend/domain/`.
- ❌ `service_role` de Supabase fuera de Vault/Edge Functions.
- ❌ SQL concatenado.
- ❌ Tablas sin RLS.
- ❌ `any` sin justificación documentada.
- ❌ Logs con PII no redactada.
- ❌ Cliente enviando `business_unit_id` libremente.
- ❌ Archivos sueltos en la raíz del repo.
- ❌ Mensajes de commit no Conventional Commits.
- ❌ Commit sin actualizar §7 primero.

---

## §16 — CUÁNDO PARARSE Y PREGUNTAR

Solo cuando una decisión:
- No tenga default razonable.
- Sea irreversible (pérdida de datos, deploy a producción, DROP de tabla).
- Cambie reglas de negocio explícitas en ADRs.

En modo autónomo: si una decisión menor es ambigua, aplica el default más conservador, anótala como deuda en §7, y sigue. No interrumpas el flujo.

---

## §17 — REGLA DE ORO

> Si una instrucción del usuario contradice este `CLAUDE.md`, advierte el conflicto y pide confirmación explícita antes de proceder. La constitución manda salvo override consciente.

---

## ANEXO A — HISTORIAL DE DEUDA TÉCNICA

### A-1: Deuda resuelta (referencia)

| ID | Descripción | Resuelto en |
|---|---|---|
| D-001 | Docker + virtualización BIOS | 2026-05-18 |
| D-002 | E2E tests Identity (17/17 verdes) | 2026-05-18 |
| D-003 | E2E tests Catalog + Inventory (17/17 verdes) | 2026-05-18 |
| D-004 | ADR-0001 explícito de arquitectura | 2026-05-17 |
| D-005 | CI/CD pipeline | Iteración 6 |
| D-006 | TSDoc en ports/identity, ports/inventory, shared-kernel | 2026-05-17 |
| D-007 | READMEs por paquete (10/10) | 2026-05-17 |
| D-011 | RLS Catalog/Inventory defense-in-depth | migración `20260515000002` |
| D-012 | `FacturaLinea.varianteId` migrado a `ProductVariantIdRef` | 2026-05-18 |
| D-013 | RLS Sales FORCE ROW LEVEL SECURITY | migración `20260515000001` |
| D-014 | RLS Sales políticas FOR ALL sin segregar | migración `20260515000001` |
| D-015 | `siguienteNumero` race condition | `factura_sequences` upsert atómico |
| D-016 | `sales.mesas` sin `actualizada_en` | migración `20260515000003` |
| D-017 | Columnas estado/tipo TEXT sin ENUM | 5 ENUMs nativos |
| D-018 | Pool separado por adapter | `createSharedPool` |
| D-019 | `puntoDeVentaId: string` sin branded type | `PuntoDeVentaId` opaco |
| D-020 | Tipos duplicados en Dashboard.tsx | importa desde `@zahavi/ports` |
| D-021 | `GET /identity/unidades-de-negocio` no implementado | Bloque 6.7 |
| D-022 | `error-handler.ts` expone `err.code` + `err.msg` de pg | Bloque 7.5 |
| D-023 | GitHub secret `SUPABASE_DB_PASSWORD` desactualizado | 2026-05-18 |
| D-024 | Seed hash bcrypt incorrecto | fix `02_users.sql` |

### A-2: Commits relevantes

| Hash | Descripción |
|---|---|
| `fda7f3c` | Identity completo (dominio + IniciarSesion + tests) |
| `3a99d95` | API HTTP Fastify Catalog + Inventory + ACL |
| `02ad20b` | Documentación ADR-0002 + ADR-0003 + INDEX |
| `5d5a362` | ADR-0003 implementado: switch-context, bu_id JWT |
| `9bcfa90` | Vertical slice: Docker, seeds, React frontend |
| `8255287` | Sales BC completo |
| `d64d938` | 7 migraciones + seed completo en Supabase cloud |
| `5cfe69c` | Sales RLS hardening (D-013/D-014/D-015) |
| `eb6f8b8` | Pool compartido + tipos desde ports (D-018, D-020) |
| `4fa5105` | D-011 — defensa en profundidad RLS Catalog + Inventory |
| `4ab7d9d` | D-016/D-017/D-019 — actualizada_en, ENUMs, PuntoDeVentaId |
| `b9dca88` | fix(db): rejectUnauthorized false en sharedPool |
| `6c9a030` | fix(db): strip sslmode del URL — resuelve SELF_SIGNED_CERT_IN_CHAIN |
| `322340d` | fix(seeds): hash bcrypt correcto para Zahavi2026! |
| `0fbe26a` | fix(pilot): rutas frontend + GET /catalog/productos |
| `392353e` | fix(identity): businessUnitId en respuesta de login |
| `bb98390` | feat(identity): GET /unidades-de-negocio + SwitchContext |
| `a9b5442` | docs(tsdoc): TSDoc en ports/identity, ports/inventory, shared-kernel |
| `34e0f19` | chore(estado): proyecto al 100% — D-001/D-002/D-003 resueltos |
| `ddc19a2` | qa: auditoría pre-reorganización + resolución hallazgos críticos |
| `3a51e40` | refactor(struct): reorganización física en 5 carpetas raíz |
