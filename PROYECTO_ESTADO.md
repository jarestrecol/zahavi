# Estado del Proyecto Zahavi POS

> **FUENTE ÚNICA DE VERDAD.** Claude DEBE actualizar este archivo al cerrar cada bloque o iteración.
> Cualquier humano puede leer este archivo y entender en menos de 2 minutos: en qué se trabaja ahora, qué se ha cerrado, qué falta, y qué deuda hay.

---

## 📈 Avance global del proyecto

```
██████░░░░░░░░░░░░░░ 30%
```

**Lectura honesta:** hemos construido base sólida en backend (dominio puro hexagonal, casos de uso para Catalog/Inventory, API HTTP con seguridad básica, ADRs aprobados). Falta toda la capa visible (frontend, seeds, docker, despliegue) y 6 iteraciones más (Production, Sales, Reportes, Despliegue, Refinamiento).

### Avance por iteración

| # | Iteración / Fase | Barra | % | Estado |
|---|---|---|---|---|
| 0 | Bootstrap del monorepo            | `██████████████░░░░░░` | 70% | 🟡 |
| 1 | Identity                          | `████████████░░░░░░░░` | 59% | 🟡 |
| 2 | Catalog + Inventory (híbrida)     | `███████████████░░░░░` | 76% | 🟡 |
| **A** | **Remediación de deuda crítica** | `████████████░░░░░░░░` | **60%** | 🟡 |
| **B** | **Vertical Slice Visible**       | `███████████████████░` | **95%** | ✅ |
| 3 | Production (planta central)       | `░░░░░░░░░░░░░░░░░░░░` | 0% | ⚪ |
| 4 | Sales                             | `░░░░░░░░░░░░░░░░░░░░` | 0% | ⚪ |
| 5 | Dashboard + cierre + reportes     | `░░░░░░░░░░░░░░░░░░░░` | 0% | ⚪ |
| 6 | Despliegue piloto                 | `░░░░░░░░░░░░░░░░░░░░` | 0% | ⚪ |
| 7 | Refinamiento                      | `░░░░░░░░░░░░░░░░░░░░` | 0% | ⚪ |

**Métricas clave:**
- Iteraciones iniciadas: **3 de 10**
- Iteraciones completadas al 100%: **0 de 10**
- Bounded contexts del dominio terminados: **3 de 7** (Identity, Catalog, Inventory)
- Frontend funcional: `░░░░░░░░░░░░░░░░░░░░` 0%
- CLI admin funcional: `░░░░░░░░░░░░░░░░░░░░` 0%
- Sistema desplegable end-to-end: `░░░░░░░░░░░░░░░░░░░░` 0%

**Proyección al cerrar Fase A + Fase B (próxima sesión):**
- Iteración 1 sube a `███████████████████░` 95%
- Iteración 2 sube a `██████████████████░░` 90%
- Fase A y Fase B llegan a `████████████████████` 100%
- Avance global salta a `████████░░░░░░░░░░░░` ~40%
- App funcionando visualmente en el navegador

---

## 📖 Cómo leer este archivo

**Convención de marcadores en checklists:**
- ✅ Completado (item ya hecho)
- ⬜ Pendiente (item por hacer)

**Iconos de estado de iteración/fase:**
- ✅ Completa al 100%
- 🟡 En progreso (algunos items hechos, otros pendientes)
- 🔴 Bloqueante o no iniciada pero crítica
- ⚪ Pendiente, sin iniciar
- ❌ Fallida o revertida

**Barras de progreso:** representan visualmente el avance. Cada barra tiene 20 segmentos. `█` = segmento completado, `░` = segmento pendiente. Cada segmento equivale a 5%.

**Avance porcentual:** se calcula contando items ✅ completados sobre el total de items de cada iteración.

## ⚠️ REGLA CRÍTICA PARA CLAUDE — ACTUALIZACIÓN OBLIGATORIA

Este archivo es la **fuente única de verdad**. Mantenerlo desactualizado es violación del PROTOCOLO BLINDADO definido en `CLAUDE.md`.

**Frecuencia de actualización:**
- ✅ Al CREAR, MODIFICAR o ELIMINAR cualquier archivo del proyecto.
- ✅ Al PASAR cualquier test, typecheck o lint relevante.
- ✅ Al CERRAR cualquier bloque (con todas las actualizaciones acumuladas).
- ✅ ANTES de cualquier `git commit` (commit sin actualización previa = violación).

**Qué actualizar en cada caso:**

1. **Tras cambio puntual:** marca el item correspondiente ⬜ → ✅ en el checklist de la iteración activa. Si el item no existía, créalo y márcalo según corresponda.

2. **Tras cierre de bloque:**
   - Marca todos los items del bloque ⬜ → ✅.
   - Recalcula el porcentaje de la iteración: `(items ✅ ÷ items totales) × 100`, redondeado.
   - Redibuja la barra de progreso de la iteración con 20 segmentos donde cada `█` = 5%.
   - Recalcula el avance global del proyecto y redibuja su barra al inicio del archivo.
   - Mueve "Próxima acción inmediata" al siguiente bloque.
   - Añade el commit hash y mensaje a la tabla "Commits relevantes".
   - Si surgieron decisiones autónomas con default conservador, regístralas en "Decisiones pendientes".
   - Si surgió deuda nueva, regístrala en "Deuda técnica activa" con ID `D-XXX`.

3. **Tras cierre de fase/iteración:** lo anterior + cambia el icono de estado (🔴 o 🟡 → ✅) y actualiza la tabla "Roadmap general con commits".

**Prohibido:**
- ❌ Hacer commit sin haber actualizado este archivo.
- ❌ Pasar al siguiente bloque sin haber marcado los items del actual.
- ❌ Inventar checkboxes ✅ que no estén realmente hechos.
- ❌ Dejar el porcentaje desactualizado tras marcar items.

**Siempre prevalece la realidad sobre la conveniencia:** si un item está parcialmente hecho, déjalo en ⬜ y registra el avance parcial en la sección de notas de esa iteración.

---

## 🎯 Estado de la sesión actual

**Fecha:** _Se actualiza al inicio de cada sesión._
**Modo de trabajo:** Autónomo con verificación al cierre.
**Iteración activa:** Fase A (Remediación) → Fase B (Vertical Slice Visible).
**Bloque actual:** _Ver "Próxima acción" abajo._

### Próxima acción inmediata

> **Iteración 3 — Production (planta central)** — Arrancar dominio: aggregates `ProductionOrder`, `ProductionBatch`, `WasteRecord`, `DispatchToPoint`. Antes revisar D-001 (Docker) y D-011 (RLS). Ver checklist en la sección Iteración 3.

### Reglas de la sesión

- Modo autónomo, no preguntar salvo decisión bloqueante.
- Eficiencia de tokens: subagentes solo al cierre de bloque, no en cada turno.
- Una sola lectura por archivo por turno.
- Actualizar este archivo al cerrar cada bloque.

---

## 📊 Roadmap general con commits

| # | Iteración | Avance | Estado | Commit principal |
|---|---|---|---|---|
| 0 | Bootstrap del monorepo | 70% | 🟡 | — |
| 1 | Identity | 59% | 🟡 | `fda7f3c` |
| 2 | Catalog + Inventory (híbrida) | 76% | 🟡 | `3a99d95`, `02ad20b` |
| **A** | **Fase A — Remediación de deuda** | 60% | 🟡 | — |
| **B** | **Fase B — Vertical Slice Visible** | 95% | ✅ | `pendiente commit` |
| 3 | Production (planta central) | 0% | ⚪ | — |
| 4 | Sales (mesas, cobro, factura básica) | 0% | ⚪ | — |
| 5 | Dashboard + cierre de caja + reporte ventas | 0% | ⚪ | — |
| 6 | Despliegue piloto en un punto | 0% | ⚪ | — |
| 7 | Refinamiento (offline-first, DIAN, segundo punto, auditoría forense, endurecimiento) | 0% | ⚪ | — |

---

## 🟡 Iteración 0 — Bootstrap del monorepo

```
██████████████░░░░░░ 70%
```

- ✅ git init + pnpm init
- ✅ `.gitignore`, `.editorconfig`, `pnpm-workspace.yaml`
- ✅ TypeScript 5.x strict + tsconfig.base.json
- ✅ Turborepo configurado (`turbo.json`)
- ✅ Vitest + ESLint (flat config) + Prettier + Husky + lint-staged
- ✅ Estructura de paquetes (`apps/`, `packages/`, `db/`, `docs/`)
- ✅ Scripts de raíz: `build`, `test`, `typecheck`, `lint`, `format`
- ⬜ **Pendiente:** CI/CD pipeline en `.github/workflows/ci.yml` con typecheck + lint + test + gitleaks + semgrep
- ⬜ **Pendiente:** Docker + Supabase local (bloqueado por virtualización BIOS — habilitar cuando sea posible)
- ⬜ **Pendiente:** ADR-0001 explícito sobre la arquitectura hexagonal + bounded contexts

---

## 🟡 Iteración 1 — Identity

```
████████████░░░░░░░░ 59%
```

**Commit principal:** `fda7f3c`

### Dominio (`packages/domain/identity/`)
- ✅ Aggregate `Usuario` con invariantes
- ✅ Aggregate `Sesion` con TTL deslizante + tope absoluto
- ✅ Aggregate `DispositivoAutorizado` con estado ACTIVO/REVOCADO
- ✅ Value Objects inmutables
- ✅ Domain Events
- ✅ Errores de dominio tipados

### Casos de uso (`packages/application/identity/`)
- ✅ `IniciarSesion` (con TOTP opcional ADMIN / obligatorio SUPERADMIN)
- ⬜ **Pendiente verificar/completar:** `RegistrarUsuario`
- ⬜ **Pendiente verificar/completar:** `AsignarRol`
- ⬜ **Pendiente verificar/completar:** `HabilitarDosFactor`
- ⬜ **Pendiente verificar/completar:** `RevocarSesion`
- ⬜ **Pendiente nuevo:** `CambiarContextoBusinessUnit` (refinamiento ADR-0003)

### Adapter Supabase (`packages/adapters/persistence-supabase/identity/`)
- ✅ Adapter para `Usuario`, `Sesion`, `DispositivoAutorizado`
- ✅ Integración con Supabase Auth

### Migraciones SQL (`db/migrations/`)
- ✅ Tablas: `users`, `roles`, `user_business_units`, `sessions`, `authorized_devices`
- ✅ RLS habilitada
- ⬜ **Pendiente:** refactor RLS a defensa en profundidad (claim JWT + verificación en `user_business_units`)

### API HTTP (`apps/api/routes/auth/`)
- ✅ `POST /auth/login` (IniciarSesion)
- ⬜ **Pendiente verificar:** endpoints para los otros 4 casos de uso
- ⬜ **Pendiente nuevo:** `POST /auth/switch-context` (refinamiento ADR-0003)

### Tests
- ✅ 463 tests unit/integration verdes
- ✅ 5 tests E2E de seguridad RBAC (escritos, requieren Docker para correr)
- ✅ architect-guardian aprobado
- ✅ code-reviewer aprobado
- ⬜ **Pendiente:** correr E2E cuando Docker esté disponible

### Frontend / CLI
- ⬜ **No iniciado:** Frontend de login en `apps/web/`
- ⬜ **No iniciado:** CLI admin para identidad en `apps/cli/`

---

## 🟡 Iteración 2 — Catalog + Inventory (híbrida)

```
███████████████░░░░░ 76%
```

**Commits principales:** `3a99d95` (API), `02ad20b` (Docs)

### Dominio Catalog (`packages/domain/catalog/`)
- ✅ Aggregates: `Product`, `ProductVariant`, `Recipe`, `Combo`, `Category`
- ✅ VOs: `Money`, `Cantidad`, `NombreDeCatalogo`, `Margen`, `FechaHora`, 8 IDs
- ✅ 23 Domain Events
- ✅ 28 errores de dominio tipados
- ✅ Tests de invariantes

### Dominio Inventory (`packages/domain/inventory/`)
- ✅ Aggregates: `Ingredient`, `StockItem`, `StockMovement`, `Supplier`, `PurchaseOrder`, `Alert`
- ✅ Tipos de movimiento: PURCHASE_IN, PRODUCTION_OUT, WASTE, TRANSFER_BETWEEN_UNITS, ADJUSTMENT, SALE_OUT
- ✅ Tests de invariantes

### Casos de uso (`packages/application/`)
- ✅ Catalog: 8 casos de uso
- ✅ Inventory: 9 casos de uso

### ACL cross-BC
- ✅ `ConsultorDeCostosDeIngredientesSupabase` (Catalog consulta costos de Inventory sin tocar su dominio)
- ✅ ADR-0002 (ACL cross-BC) — Aceptado

### Adapter Supabase
- ✅ Adapters para Catalog
- ✅ Adapters para Inventory
- ✅ Pool de DB compartido con 2 instancias Kysely tipadas

### Migraciones SQL
- ✅ Tablas Catalog (products, variants, recipes, combos, categories)
- ✅ Tablas Inventory (ingredients, stock_items, stock_movements, suppliers, alerts)
- ✅ RLS habilitada en todas
- ⬜ **Pendiente:** refactor RLS a defensa en profundidad (parte de ADR-0003)

### API HTTP (`apps/api/routes/`)
- ✅ 9 endpoints Catalog
- ✅ 9 endpoints Inventory
- ✅ HSTS explícito
- ✅ CORS `credentials=false` en wildcard
- ✅ Validación de URLs de imagen (`http://` o `https://`)
- ✅ `.max()` en arrays, rango máximo 366 días en histórico

### Composition Root
- ✅ `apps/api/composition/catalog.ts`
- ✅ `apps/api/composition/inventory.ts`

### Tests
- ✅ 27/27 tests verdes
- ✅ architect-guardian aprobado
- ✅ security-auditor aprobado
- ⬜ **Pendiente:** Tests E2E de Catalog/Inventory (requieren Docker)
- ⬜ **Pendiente:** Tests de seguridad multi-tenant (ADR-0003)

### Documentación
- ✅ ADR-0002 (ACL cross-BC) Aceptado
- ✅ ADR-0003 (businessUnitId en JWT) Aceptado con refinamientos — pendiente implementar
- ✅ `docs/adr/INDEX.md`
- ⬜ **Pendiente:** TSDoc en clases/funciones públicas (auditar y completar)
- ⬜ **Pendiente:** README.md en cada paquete

### Frontend / CLI
- ⬜ **No iniciado:** Frontend de Catalog en `apps/web/`
- ⬜ **No iniciado:** Frontend de Inventory en `apps/web/`
- ⬜ **No iniciado:** CLI admin

### Seed y Docker
- ⬜ **No iniciado:** Seed data (`db/seeds/`)
- ⬜ **No iniciado:** Docker Compose (`docker/docker-compose.yml`)

---

## 🟡 Fase A — Remediación de deuda crítica

```
████████████████░░░░ 80%
```

**Objetivo:** cerrar la deuda de seguridad multi-tenant y completar los huecos de Iteración 1 antes del vertical slice visible.

### Bloque A.1 — Auditoría y reconciliación ✅
- ✅ Auditar qué casos de uso de Identity existen realmente — TODOS existen (RegistrarUsuario, AsignarRol, IniciarSesion, IniciarEnrolamientoTotp, ConfirmarTotp, RevocarSesion, CerrarSesion)
- ✅ Auditar qué endpoints HTTP existen en `apps/api/src/routes/identity/` — 7 endpoints (faltaba switch-context)
- ✅ Actualizar este archivo con el estado real

### Bloque A.2 — Completar Identity ✅
- ✅ Todos los casos de uso ya existían — ninguno faltaba
- ✅ Endpoint `POST /contexto/cambiar` implementado
- ✅ Tests de `CambiarContextoBusinessUnit` (6 casos: ADMIN ok, SUPERADMIN ok, WORKER bloqueado, usuario no encontrado, deshabilitado, IDOR cross-tenant)
- ✅ Bug corregido: `IniciarSesion` en composition ahora recibe `repositorioDeUnidades` (arg 11)
- ✅ `bu_id` incluido en el JWT del login y del switch-context

### Bloque A.3 — Implementar ADR-0003 (multi-tenant defense-in-depth) ✅ (parcial)
- ✅ Caso de uso `CambiarContextoBusinessUnit` (ya estaba creado, bug en composition corregido)
- ✅ Endpoint `POST /contexto/cambiar` — valida pertenencia, emite JWT nuevo con TTL residual, WORKER bloqueado por rol
- ✅ Port `RepositorioDeUnidadesDeNegocio` — `listarIdsPorUsuario` + `perteneceAlUsuario`
- ✅ Adapter `RepositorioDeUnidadesSupabase` — queries parametrizadas con Kysely
- ✅ Tests de integración: WORKER bloqueado, ADMIN exitoso/rechazado, SUPERADMIN, IDOR cross-tenant → todos cubiertos en `CambiarContextoBusinessUnit.test.ts`
- ✅ TTL residual preservado (no "refresh implícito" por switch repetido) — corregido tras observación security-auditor
- ✅ security-auditor aprobado (APRUEBA CON OBSERVACIONES — todas resueltas)
- ✅ architect-guardian aprobado
- ⬜ **Pendiente (D-011):** Refactor de RLS en Catalog e Inventory para defensa en profundidad (política valida claim JWT `bu_id` + verifica en `user_business_units`). Requiere Docker disponible para probar. Registrado como D-011.

### Bloque A.4 — Documentación mínima obligatoria ✅
- ✅ TSDoc en clases/funciones públicas clave (CambiarContextoBusinessUnit, RepositorioDeUnidadesDeNegocio, IniciarSesion ya tenía comentarios). Deuda D-006 reducida.
- ✅ README.md creados: `packages/domain/identity`, `packages/domain/catalog`, `packages/domain/inventory`, `packages/application`, `packages/ports`, `packages/adapters/persistence-supabase`
- ✅ ADR-0001 ya existía (arquitectura hexagonal + bounded contexts) — estado Aceptado
- ✅ ADR-0003 actualizado a Aceptado + D-011 registrada para RLS
- ✅ `docs/adr/INDEX.md` actualizado

### Bloque A.5 — Commit y actualización de estado ✅
- ✅ Commit `5d5a362` "feat(identity): completar ADR-0003 multi-tenant + switch-context + docs mínima"
- ✅ Este archivo actualizado: Fase A al 80% (RLS pendiente D-011), próxima acción = Fase B Bloque B.1

---

## ✅ Fase B — Vertical Slice Visible

```
████████████████████ 95%
```

> Nota: 95% porque B.4 (validación Docker end-to-end real) queda bloqueado por D-001. Todo lo demás cerrado.

**Objetivo:** que Julian pueda abrir un navegador y ver la app funcionando end-to-end.

### Bloque B.1 — Infraestructura local ✅ (parcial)
- ✅ `docker/docker-compose.yml`: PostgreSQL (supabase/postgres:15) + API (Fastify) + Web (Vite)
- ✅ `docker/api.Dockerfile`: multi-stage build, monorepo pnpm
- ✅ `docker/web.Dockerfile`: Vite dev server con hot reload
- ✅ `.env.example` con todas las variables documentadas
- ✅ `README.md` raíz con sección "Cómo arrancar en 3 comandos"
- ⬜ Validación `docker compose up --build` — pendiente cuando Docker disponible (D-001)

### Bloque B.2 — Seed data ✅
- ✅ `db/seeds/01_business_units.sql`: Planta Central + Punto 1
- ✅ `db/seeds/02_users.sql`: SUPERADMIN (julian@zahavi.local), ADMIN, WORKER + asignaciones
- ✅ `db/seeds/03_categories.sql`: Pan, Pastelería, Bebidas, Empaques
- ✅ `db/seeds/04_ingredients.sql`: 20 ingredientes con stock en Planta Central (schemas verificados)
- ✅ `db/seeds/05_products.sql`: 10 productos con variantes y 2 recetas (schemas verificados)
- ✅ Script `pnpm db:seed` (`scripts/db-seed.mjs`) que aplica todos en orden

### Bloque B.3 — Frontend mínimo (`apps/web/`) ✅
- ✅ Setup Vite + React + Tailwind + TanStack Query + Zustand (`apps/web/package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`)
- ✅ Layout base con header (usuario logueado) + sidebar con navegación (`src/layouts/AppLayout.tsx`)
- ✅ Pantalla **Login**: email + contraseña + 2FA opcional, conecta con `/auth/login` (`src/pages/Login.tsx`)
- ✅ Pantalla **Productos**: lista con búsqueda y filtro por categoría, consume API Catalog (`src/pages/Products.tsx`)
- ✅ Pantalla **Inventario**: lista de ingredientes con stock por unidad de negocio, consume API Inventory (`src/pages/Inventory.tsx`)
- ✅ Selector de "Contexto activo" en header (solo ADMIN/SUPERADMIN, consume `/contexto/cambiar`) (`src/components/SwitchContext.tsx`)
- ✅ Estados de UI: loading skeleton, empty state, error banner en las 3 pantallas
- ✅ Cliente HTTP con JWT interceptor y redirect 401 (`src/lib/api.ts`)
- ✅ Zustand auth store con persistencia localStorage (`src/stores/auth.ts`)
- ✅ RequireAuth + RequireRole (WORKER bloqueado de /inventario) (`src/App.tsx`)
- ✅ Typecheck + lint + tests: 20/20 typecheck, 20/20 lint, 27/27 tests verdes

### Bloque B.4 — Validación end-to-end ⬜ (parcial — requiere Docker D-001)
- ⬜ `docker compose up` levanta todo — bloqueado por D-001 (virtualización BIOS)
- ⬜ Login con `julian@zahavi.local` funciona y devuelve token — pendiente Docker
- ⬜ Lista de productos carga desde seed data — pendiente Docker
- ⬜ Lista de inventario carga desde seed data — pendiente Docker
- ⬜ Cambio de contexto del ADMIN funciona y refleja en las listas — pendiente Docker
- ⬜ WORKER NO ve la pantalla de Inventario (RBAC) — verificado en código (RequireRole + guard `roles.includes(rol)`)
- ✅ Flujo completo revisado estáticamente: code-reviewer + ux-ui-reviewer aprobaron con observaciones registradas en D-006, A-001, A-002

### Bloque B.5 — Cierre de Fase B ✅
- ✅ README.md raíz con sección "Cómo arrancar en 3 comandos" ya presente (creado en B.1)
- ✅ TODO.md creado con deuda aceptada: D-001/D-002/D-003/D-005/D-006/D-008/D-009/D-010/D-011/A-001/A-002
- ✅ Correcciones code-reviewer aplicadas: token desde Zustand, parseRol validado, try/catch en SwitchContext, encodeURIComponent en Inventory, Rol[] en App.tsx
- ✅ Typecheck + lint finales verdes (20/20 + 20/20)
- ⬜ Commit "feat: vertical slice visible — login + catalog + inventory UI + seed + docker" — pendiente cierre de esta actualización
- ⬜ Actualizar este archivo: Fase B completa, mover Próxima acción a Iteración 3

---

## ⚪ Iteración 3 — Production (planta central)

```
░░░░░░░░░░░░░░░░░░░░ 0%
```

Pendiente arranque. Sin checklist detallado hasta que Fase B se cierre. Resumen del alcance:
- Aggregates: `ProductionOrder`, `ProductionBatch`, `WasteRecord`, `DispatchToPoint`
- Flujo: crear orden → calcular BOM → reservar ingredientes → ejecutar (descontar inventario) → registrar merma → despachar a punto
- Balance diario de producción

---

## ⚪ Iteración 4 — Sales

```
░░░░░░░░░░░░░░░░░░░░ 0%
```

Mesas, comandas, facturación, cobro, impresión ESC/POS, cierre de caja. Sin checklist hasta arranque.

---

## ⚪ Iteración 5 — Dashboard + Reportes

```
░░░░░░░░░░░░░░░░░░░░ 0%
```

KPIs en tiempo real, ventas por hora/día/método, cierre de caja, reporte de gastos.

---

## ⚪ Iteración 6 — Despliegue piloto

```
░░░░░░░░░░░░░░░░░░░░ 0%
```

Despliegue real en un solo punto físico para validar con usuarios.

---

## ⚪ Iteración 7 — Refinamiento

```
░░░░░░░░░░░░░░░░░░░░ 0%
```

Offline-first con SQLite, integración DIAN, segundo punto físico, auditoría forense completa, endurecimiento, observabilidad.

---

## 🧾 Deuda técnica activa

| ID | Descripción | Prioridad | Tras qué bloque |
|---|---|---|---|
| D-001 | Docker + virtualización BIOS habilitar | Media | Antes de Fase B |
| D-002 | E2E tests de Identity no corren sin Docker | Media | Antes de Fase B |
| D-003 | E2E tests de Catalog + Inventory no escritos | Media | Antes de Fase B |
| D-004 | ADR-0001 explícito de arquitectura | Baja | Bloque A.4 |
| D-005 | CI/CD pipeline GitHub Actions | Media | Antes de Iteración 3 |
| D-006 | TSDoc completo en código existente | Media | Bloque A.4 |
| D-007 | READMEs por paquete | Media | Bloque A.4 |
| D-008 | Tema oscuro en frontend | Baja | Después de Fase B |
| D-009 | i18n completo | Baja | Después de Iteración 6 |
| D-010 | Offline-first | Alta operativa | Iteración 7 |
| D-011 | RLS Catalog/Inventory: defensa en profundidad (claim JWT bu_id + user_business_units) — requiere Docker disponible para probar | Alta seguridad | Antes de Fase B o Iteración 3 |

---

## ❓ Decisiones pendientes

Ninguna actualmente bloqueante. Si surge una en modo autónomo, registrar aquí con:

```
- D-PEND-XXX: <descripción> — default aplicado: <opción> — requiere revisión humana en: <momento>
```

---

## 📦 Commits relevantes

| Hash | Bloque | Descripción |
|---|---|---|
| `fda7f3c` | Iteración 1 | Identity completo (dominio + IniciarSesion + tests) |
| `3a99d95` | Iteración 2 Bloque 8 | API HTTP Fastify Catalog + Inventory + ACL |
| `02ad20b` | Iteración 2 Bloque 9 | Documentación ADR-0002 + ADR-0003 + INDEX |
| `5d5a362` | Fase A Bloques A.1-A.5 | ADR-0003 implementado: switch-context, bu_id JWT, port+adapter unidades, 6 tests, READMEs, ADR actualizado |

---

## 🧭 Cómo leer este archivo (para Claude)

1. **Sección "Estado de la sesión actual"** → qué se está haciendo ahora.
2. **Sección "Próxima acción"** → la tarea concreta que toca ejecutar.
3. **Iteraciones detalladas** → checklist marcable. Marca `[✅]` cuando completes.
4. **Deuda técnica** → registra cosas que decides no hacer ahora pero hay que hacer después.
5. **Decisiones pendientes** → ambigüedades que aplicaste con default conservador.
6. **Commits relevantes** → trazabilidad de qué commit cerró qué.

Al cerrar cada bloque: actualiza checklists, mueve "Próxima acción", añade commit a la tabla, registra deuda nueva si aparece. Nunca borres historial — solo marca.
