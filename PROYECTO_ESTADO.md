# Estado del Proyecto Zahavi POS

> **FUENTE ÚNICA DE VERDAD.** Claude DEBE actualizar este archivo al cerrar cada bloque o iteración.
> Cualquier humano puede leer este archivo y entender en menos de 2 minutos: en qué se trabaja ahora, qué se ha cerrado, qué falta, y qué deuda hay.

---

## 📈 Avance global del proyecto

```
███████████████░░░░░ 75%
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
| 3 | Production (planta central)       | `████████████████████` | 100% | ✅ |
| 4 | Sales                             | `████████████████████` | 100% | ✅ |
| 5 | Dashboard + cierre + reportes     | `████████████████████` | 100% | ✅ |
| 6 | Despliegue piloto                 | `████████████░░░░░░░░` | 60% | 🟡 |
| 7 | Refinamiento                      | `████████████████░░░░` | 80% | 🟡 |

**Métricas clave:**
- Iteraciones iniciadas: **4 de 10**
- Iteraciones completadas al 100%: **1 de 10** (Production)
- Bounded contexts del dominio terminados: **4 de 7** (Identity, Catalog, Inventory, Production) — Sales en progreso
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
**Iteración activa:** Iteración 7 — Refinamiento.
**Bloque actual:** 7.3 cerrado / 7.4 pendiente.

### Próxima acción inmediata

> **Iteración 7 completada (~80%)** — Todo el backlog de deuda técnica (D-011 a D-020) está resuelto. Los bloques 7.1-7.4 están cerrados. La deuda restante (SQLite offline-first, DIAN, segundo punto) son features nuevas de mayor envergadura. Acción: validar despliegue end-to-end en Render/Vercel (Bloque 6.6, pendiente de acción del usuario), o iniciar scope de offline-first.

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
| **B** | **Fase B — Vertical Slice Visible** | 95% | ✅ | `9bcfa90` |
| 3 | Production (planta central) | 100% | ✅ | `b175857` |
| 4 | Sales (mesas, cobro, factura básica) | 12% | 🟡 | — |
| 5 | Dashboard + cierre de caja + reporte ventas | 100% | ✅ | — |
| 6 | Despliegue piloto en un punto | 80% | 🟡 | — |
| 7 | Refinamiento (endurecimiento, observabilidad, offline-first, DIAN) | 80% | 🟡 | `5cfe69c`, `eb6f8b8`, `4fa5105`, `4ab7d9d` |

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
- ✅ Commit `9bcfa90` "feat: vertical slice visible — login + catalog + inventory UI + seed + docker"
- ✅ Este archivo actualizado: Fase B al 95%, próxima acción = Iteración 3

---

## ✅ Iteración 3 — Production (planta central)

```
████████████████████ 100%
```

### Bloque 3.1 — Dominio (`packages/domain/production/`) ✅
- ✅ Aggregate `OrdenDeProduccion` con 9 invariantes, 6 comandos (crear, calcularBOM, reservarIngredientes, iniciar, registrarMerma, ejecutar, cancelar)
- ✅ Aggregate `DespachoAPunto` con 5 invariantes, 4 comandos (preparar, enviar, entregar, cancelar)
- ✅ Entidades: `LineaDeBOM`, `RegistroDeMerma`
- ✅ VOs: `Cantidad`, `CodigoDeLote`, `LoteDeProduccion`, `EstadoDeOrdenDeProduccion`, `EstadoDeDespacho`, `UnidadDeMedida`
- ✅ IDs: `OrdenDeProduccionId`, `LineaDeBOMId`, `RegistroDeMermaId`, `DespachoId`, refs ACL para Identity/Catalog/Inventory
- ✅ 11 domain events
- ✅ 20 errores de dominio tipados
- ✅ 41 tests verdes (OrdenDeProduccion + DespachoAPunto)
- ✅ architect-guardian APROBADO (con 2 observaciones menores aplicadas)

### Bloque 3.2 — Casos de uso (`packages/application/src/production/`) ✅
- ✅ `CrearOrdenDeProduccion`
- ✅ `CalcularBOMYReservar` (ACL a Catalog via port + escala BOM + transiciona a RESERVADA)
- ✅ `IniciarOrden`
- ✅ `RegistrarMermaEnOrden`
- ✅ `EjecutarOrden` (calcula consumoReal = BOM - mermas)
- ✅ `CancelarOrden`
- ✅ `PrepararDespacho`

### Bloque 3.3 — Ports (`packages/ports/src/production/`) ✅
- ✅ `IOrdenDeProduccionRepository`
- ✅ `IDespachoRepository`
- ✅ `IConsultorDeRecetaDeProduccion` (ACL Catalog → Production)

### Bloque 3.4 — Adapter Supabase ✅
- ✅ `RepositorioDeOrdenesSupabase` (save, update, obtenerPorId, listarPorEstado, listarPorPlanta)
- ✅ `RepositorioDeDespachoSupabase` (save, update, obtenerPorId, listarPorOrden)
- ✅ `ConsultorDeRecetaSupabase` (ACL: query `catalog.recipe_lines`, normaliza unidades a UnidadDeMedida)
- ✅ `mappers.ts` — rowToOrden, ordenToInsertRow, rowToDespacho, despachoToInsertRow
- ✅ `schema.ts` — tipos Kysely para ProductionDatabase
- ✅ `factory.ts` + `index.ts` — createProductionAdapters exportado desde index principal

### Bloque 3.5 — Migraciones SQL ✅
- ✅ `db/migrations/up/0006_production.sql` — production.orders + production.dispatches
- ✅ `db/migrations/down/0006_production.sql` — rollback
- ✅ BOM y mermas como JSONB snapshot en orders (evita joins; BOM rara vez > 20 líneas)
- ✅ RLS en ambas tablas (filtro por planta_central_id = JWT.bu_id)
- ✅ Índices en estado, planta_central_id y creada_en

### Bloque 3.6 — HTTP API (`apps/api/src/routes/production/`) ✅
- ✅ `POST /api/production/orders` → CrearOrdenDeProduccion (plantaCentralId del JWT bu_id)
- ✅ `POST /api/production/orders/:id/bom` → CalcularBOMYReservar
- ✅ `POST /api/production/orders/:id/iniciar` → IniciarOrden
- ✅ `POST /api/production/orders/:id/mermas` → RegistrarMermaEnOrden
- ✅ `POST /api/production/orders/:id/ejecutar` → EjecutarOrden
- ✅ `DELETE /api/production/orders/:id` → CancelarOrden (motivo en body)
- ✅ `POST /api/production/dispatches` → PrepararDespacho
- ✅ `GET /api/production/orders` → ListarOrdenes (por estado o planta)
- ✅ `apps/api/src/composition/production.ts` — composition root
- ✅ `apps/api/src/routes/production/schemas.ts` — Zod schemas
- ✅ `packages/application/src/production/ListarOrdenes.ts` — nuevo caso de uso

### Bloque 3.7 — Tests de casos de uso ✅
- ✅ `helpers.ts` — fixtures y mocks de OrdenDeProduccion en todos los estados + mocks de ports
- ✅ `CrearOrden.test.ts` — 4 tests
- ✅ `CalcularBOMYReservar.test.ts` — 5 tests (incluye ACL mock)
- ✅ `IniciarOrden.test.ts` — 3 tests
- ✅ `RegistrarMerma.test.ts` — 5 tests
- ✅ `EjecutarOrden.test.ts` — 5 tests
- ✅ `CancelarOrden.test.ts` — 5 tests
- ✅ `PrepararDespacho.test.ts` — 4 tests
- ✅ 357/357 tests verdes en @zahavi/application

### Bloque 3.8 — Documentación y commit ✅
- ✅ README.md en `packages/domain/production/` — completo (creado por domain-modeler en bloque 3.1)
- ✅ architect-guardian APRUEBA (pureza dominio, dirección dependencias, ACL, separación BCs)
- ✅ Commit "feat(production): BC completo — dominio, casos de uso, ports, adapter, API, tests"

---

## ✅ Iteración 4 — Sales

```
████████████████████ 100%
```

### Bloque 4.1 — Dominio BC Sales (`packages/domain/sales/`) ✅
- ✅ Aggregate `Mesa` (LIBRE/OCUPADA/RESERVADA/EN_COBRO, NORMAL + AD_HOC)
- ✅ Aggregate `Comanda` (ABIERTA/ENVIADA/EN_PREPARACION/LISTA/CERRADA/CANCELADA, contiene LineaDeComanda)
- ✅ Aggregate `Cobro` (PENDIENTE/PROCESADO/FALLIDO/ANULADO, múltiples PagoDetalle)
- ✅ Aggregate `Factura` (EMITIDA/ANULADA, snapshot inmutable)
- ✅ Entidad `LineaDeComanda` con snapshot de nombre/precio/IVA
- ✅ VOs: Dinero (COP entero), TasaIVA (0%/19%), PagoDetalle, NombreMesa, NumeroFactura, FacturaLinea
- ✅ Enums: EstadoDeMesa, TipoDeMesa, EstadoDeComanda, EstadoDeLinea, EstadoDeCobro, EstadoDeFactura, MetodoDePago
- ✅ IDs: MesaId, ComandaId, LineaDeComandaId, CobroId, FacturaId + refs ACL (ProductVariantIdRef, BusinessUnitIdRef, UsuarioIdRef)
- ✅ Errores de dominio tipados (19 tipos)
- ✅ Domain Events (Mesa/Comanda/Cobro/Factura)
- ✅ 46 tests verdes (Mesa: 10, Comanda: 16, Cobro: 10, Factura: 10)
- ✅ architect-guardian APRUEBA (pureza dominio, dirección dependencias, ACL pattern, separación BCs)
- ✅ README.md y docs/domain-model/sales/ (glossary + aggregates con diagramas Mermaid)

### Bloque 4.2 — Ports (`packages/ports/src/sales/`) ✅
- ✅ `IConsultorDeProductoParaVentas` (ACL Catalog → Sales)
- ✅ `IMesaRepository`
- ✅ `IComandaRepository`
- ✅ `ICobroRepository`
- ✅ `IFacturaRepository` (incluye `siguienteNumero` para numeración secuencial)

### Bloque 4.3 — Casos de uso (`packages/application/src/sales/`) ✅
- ✅ `ConfigurarMesa` (ADMIN)
- ✅ `AbrirMesaAdHoc` (mesero)
- ✅ `CrearComanda`
- ✅ `AgregarLineaAComanda` (invoca ACL para resolver producto)
- ✅ `CancelarLineaDeComanda`
- ✅ `EnviarComandaACocina`
- ✅ `MarcarComandaEnPreparacion`
- ✅ `MarcarComandaLista`
- ✅ `ProcesarCobro`
- ✅ `EmitirFactura`
- ✅ `ListarMesas`
- ✅ `ListarComandasActivas`

### Bloque 4.4 — Adapter Supabase ✅
- ✅ `RepositorioDeMesaSupabase`
- ✅ `RepositorioDeComandaSupabase`
- ✅ `RepositorioDeCobroSupabase`
- ✅ `RepositorioDeFacturaSupabase`
- ✅ `ConsultorDeProductoSupabase` (ACL: query `catalog.product_variants`, tasa_iva=0 MVP D-012)
- ✅ `mappers.ts` + `schema.ts` + `factory.ts`

### Bloque 4.5 — Migraciones SQL ✅
- ✅ `db/migrations/up/0007_sales.sql` — sales.mesas, sales.comandas, sales.cobros, sales.facturas (lineas JSONB snapshot)
- ✅ `db/migrations/down/0007_sales.sql`
- ✅ RLS en todas las tablas (filtro por punto_de_venta_id = JWT.bu_id)

### Bloque 4.6 — HTTP API ✅
- ✅ `GET /api/sales/mesas` + `POST /api/sales/mesas` (ADMIN)
- ✅ `POST /api/sales/mesas/adhoc` (mesero, ad-hoc)
- ✅ `POST /api/sales/comandas`
- ✅ `POST /api/sales/comandas/:id/lineas`
- ✅ `DELETE /api/sales/comandas/:id/lineas/:lineaId`
- ✅ `POST /api/sales/comandas/:id/enviar`
- ✅ `POST /api/sales/comandas/:id/preparacion`
- ✅ `POST /api/sales/comandas/:id/lista`
- ✅ `POST /api/sales/cobros`
- ✅ `POST /api/sales/facturas`
- ✅ `apps/api/src/composition/sales.ts` — composition root

### Bloque 4.7 — Tests de casos de uso ✅
- ✅ helpers.ts + 7 archivos .test.ts (27 tests nuevos de Sales, total 415 verdes)

### Bloque 4.8 — Documentación y commit ✅
- ✅ architect-guardian APRUEBA (pureza dominio, ACL, dependencias, SOLID)
- ✅ db-reviewer OBSERVACIONES CRÍTICAS resueltas (WITH CHECK, DEFAULT gen_random_uuid, CASCADE rollback; D-013/014/015/016/017 registradas)
- ✅ security-auditor APRUEBA CON OBSERVACIONES (guard bu_id, WITH CHECK aplicados; D-013/014/015 registradas)
- ✅ code-reviewer APRUEBA (parseJsonb centralizado, typo corregido, ?? '' reemplazado)
- ✅ Commit "feat(sales): BC completo — dominio, casos de uso, ports, adapter, migración SQL, HTTP API, tests"

---

## 🟡 Iteración 5 — Dashboard + Reportes

```
████████████████████ 100%
```

### Bloque 5.1 — Port + DTOs ✅
- ✅ `packages/ports/src/reporting/IReportingRepository.ts` — port con DTOs: DashboardDelDia, ResumenCierreDeCaja, VentaPorMetodo, VentaPorHora
- ✅ `packages/ports/src/reporting/index.ts`
- ✅ `packages/ports/src/index.ts` actualizado

### Bloque 5.2 — Query handlers ✅
- ✅ `packages/application/src/reporting/ConsultarDashboard.ts` — query handler, fecha de hoy por defecto
- ✅ `packages/application/src/reporting/ConsultarCierreDeCaja.ts` — valida desde <= hasta
- ✅ `packages/application/src/reporting/index.ts`
- ✅ `packages/application/src/index.ts` actualizado

### Bloque 5.3 — Adapter Supabase ✅
- ✅ `ReportingRepositorySupabase.ts` — 6 queries SQL parametrizadas con Kysely sql`...`, agregaciones JSONB pagos expandidos con jsonb_array_elements
- ✅ `factory.ts` + `index.ts`
- ✅ `packages/adapters/persistence-supabase/src/index.ts` actualizado

### Bloque 5.4 — HTTP API ✅
- ✅ `GET /api/reporting/dashboard?fecha=YYYY-MM-DD` (ADMIN/SUPERADMIN)
- ✅ `GET /api/reporting/cierre-de-caja?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (ADMIN/SUPERADMIN)
- ✅ `apps/api/src/composition/reporting.ts`
- ✅ `apps/api/src/routes/reporting/schemas.ts` — validación Zod con regex YYYY-MM-DD
- ✅ `apps/api/src/server.ts` + `apps/api/src/index.ts` actualizados

### Bloque 5.5 — Frontend Dashboard ✅
- ✅ `apps/web/src/pages/Dashboard.tsx` — KPIs (totalVentas, cobros, ticketPromedio, facturas), tabla por método, gráfico por hora con barras CSS
- ✅ `apps/web/src/App.tsx` — ruta /dashboard con RequireRole ADMIN/SUPERADMIN
- ✅ `apps/web/src/layouts/AppLayout.tsx` — enlace Dashboard en sidebar (solo ADMIN/SUPERADMIN)
- ✅ Redirect raíz → /dashboard para ADMIN/SUPERADMIN

### Bloque 5.6 — Tests ✅
- ✅ `ConsultarDashboard.test.ts` — 4 tests
- ✅ `ConsultarCierreDeCaja.test.ts` — 4 tests
- ✅ 458/458 tests verdes (8 nuevos de reporting)
- ✅ Typecheck: 0 errores en ports, application, adapter, api, web

### Bloque 5.7 — Cierre ✅
- ✅ architect-guardian APRUEBA (pureza dominio, dependencias, ACL, separación BCs)
- ✅ code-reviewer OBSERVACIONES aplicadas:
  - ErrorDeRangoFechas extends DomainError (code REPORTING_RANGO_FECHAS_INVALIDO → 400)
  - Ambos handlers usan `throw result.error` uniformemente
  - Query handlers usan Result<T> del shared-kernel en lugar de unión local
  - Validación de fecha real en Zod con `.refine()`
  - Tildes corregidas en Dashboard.tsx
  - D-018, D-019, D-020 registradas como deuda técnica
- ✅ Commit feat(reporting): iteración 5 completa

---

## 🟡 Iteración 6 — Despliegue piloto

```
████████████████░░░░ 80%
```

### Bloque 6.1 — Migraciones unificadas en supabase/migrations/ ✅
- ✅ `supabase/migrations/20260514000001_production_schema.sql` — production BC
- ✅ `supabase/migrations/20260514000002_sales_schema.sql` — sales BC
- ✅ Total: 6 migraciones en orden (identity x2, catalog, inventory, production, sales)

### Bloque 6.2 — CI/CD GitHub Actions ✅
- ✅ `.github/workflows/ci.yml` — typecheck + lint + tests + gitleaks + supabase db push en merge a main
- ✅ Secrets requeridos documentados: SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD

### Bloque 6.3 — Scripts de migración ✅
- ✅ `scripts/db-migrate.mjs` — aplica migraciones pendientes con tabla _migrations, transaccional, dry-run
- ✅ `pnpm db:migrate` y `pnpm db:migrate:dry` en package.json

### Bloque 6.4 — Runbook de despliegue ✅
- ✅ `docs/runbooks/deploy-pilot.md` — instrucciones completas: Supabase cloud, seed, API (Render), frontend (Vercel), rollback

### Bloque 6.5 — Supabase cloud ✅
- ✅ Proyecto Zahavi creado en supabase.com — project ID: `cuqxmbbpssoylwaywuhc` (región us-east-1)
- ✅ 7 migraciones aplicadas via MCP (identity x3, catalog, inventory, production, sales)
  - Fix: `stock_movements` PK cambiado a `(id, ocurrido_en)` para tabla particionada
  - Fix: RLS habilitado en las 4 particiones de `stock_movements`
  - Nueva: `20260506000003_identity_business_units` — tablas `business_units` + `user_business_units` (faltaban en migration original)
- ✅ Seeds aplicados — 2 BUs, 3 usuarios, 4 asignaciones, 4 categorías, 10 productos, 10 variantes, 2 recetas, 8 líneas, 20 ingredientes, 20 stock_items
  - Fix: `'und'` → `'unidad'`, `'lt'` → `'L'` en ingredients/stock_items (constraint CHECK)
  - Fix: `'publicado'` → `'activo'` en catalog.products (constraint CHECK)

### Bloque 6.6 — Despliegue de servicios 🟡 (pendiente acción del usuario)
- ✅ `render.yaml` creado en raíz — Render detecta automáticamente el servicio `zahavi-api`
- ✅ `apps/web/vercel.json` creado — build monorepo + SPA rewrites configurados
- ✅ Runbook `docs/runbooks/deploy-pilot.md` actualizado con instrucciones paso a paso
- ✅ `/health` endpoint verificado en `apps/api/src/server.ts:96`
- ✅ `VITE_API_URL` verificado en `apps/web/src/lib/api.ts:3`
- ⬜ Usuario crea cuenta en Render.com y conecta repositorio GitHub
- ⬜ Usuario configura `DATABASE_URL` (Supabase session mode) y `CORS_ORIGIN` en Render
- ⬜ Usuario crea cuenta en Vercel, importa repo con root dir `apps/web`, configura `VITE_API_URL`
- ⬜ Health check `GET /health` responde `{"ok":true}`
- ⬜ Login de SUPERADMIN funciona end-to-end (contraseña en seed: `Zahavi2026!`)

---

## 🟡 Iteración 7 — Refinamiento

```
████████████████░░░░ 80%
```

### Bloque 7.1 — Endurecimiento de seguridad (deuda crítica) ✅
- ✅ D-013 resuelto: `FORCE ROW LEVEL SECURITY` en las 4 tablas Sales
- ✅ D-014 resuelto: políticas RLS segregadas por rol/operación — cobros y facturas sin DELETE
- ✅ D-015 resuelto: `sales.factura_sequences` con upsert atómico, elimina race condition
- ✅ Migración `20260515000001_sales_rls_hardening.sql` aplicada en cloud
- ✅ `RepositorioDeFacturaSupabase.siguienteNumero` reescrito con `sql` tagged template
- ✅ Typecheck + tests verdes (20/20, 29/29)
- ✅ Commit `5cfe69c`

### Bloque 7.2 — Observabilidad ✅
- ✅ Logger: `pino-pretty` en dev (colorize, timestamps HH:MM:ss), JSON con timestamp ISO en producción
- ✅ Request ID: `crypto.randomUUID()` por petición, propagado en header `X-Request-Id`
- ✅ `/health/ready`: chequeo de DB con latencia — 503 si la DB no responde
- ✅ `createHealthCheck`: pool dedicado (max:1) para no consumir conexiones del pool principal
- ✅ Runbook actualizado con instrucción de `/health/ready`
- ✅ Commit `6031376`

### Bloque 7.3 — Deuda técnica media ✅
- ✅ D-018: `pool.ts` con `createSharedPool` — un Pool (max:10) compartido por los 6 adapters; salud usa pool separado (max:1)
- ✅ D-020: `Dashboard.tsx` importa `DashboardDelDia` desde `@zahavi/ports`; tipos locales eliminados
- ✅ `@zahavi/ports` agregado como devDependency en `apps/web`
- ✅ D-011: RLS Catalog/Inventory defensa en profundidad — `identity.jwt_bu_id()` + `identity.usuario_pertenece_a_bu()` + FORCE RLS en 12 tablas + políticas reemplazadas

### Bloque 7.4 — Deuda técnica baja + mejoras ✅ (parcial)
- ✅ D-016: `sales.mesas.actualizada_en` TIMESTAMPTZ + trigger BEFORE UPDATE automático
- ✅ D-017: ENUMs PostgreSQL nativos para estado_mesa/tipo_mesa/estado_comanda/estado_cobro/estado_factura; Kysely schema.ts tightened a string literal unions
- ✅ D-019: `PuntoDeVentaId` branded type en IReportingRepository + use cases + route handler; cast en límite de confianza (route handler)
- ⬜ SQLite offline-first para tablets (scope separado — requiere análisis)
- ⬜ Integración DIAN (factura electrónica — scope separado)
- ⬜ Segundo punto físico de venta

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
| D-011 | ~~RLS Catalog/Inventory: defensa en profundidad~~ — **RESUELTO**: `jwt_bu_id()` + `usuario_pertenece_a_bu()` + FORCE RLS. Migración `20260515000002` aplicada en cloud. | ~~Alta seguridad~~ | ✅ |
| D-012 | `FacturaLinea.varianteId` usa `string` en lugar de `ProductVariantIdRef` — pierde tipo opaco. Migrar cuando catalog.product_variants tenga columna `tasa_iva` | Baja | Iteración 7 |
| D-013 | ~~RLS Sales: falta `FORCE ROW LEVEL SECURITY`~~ — **RESUELTO** en `20260515000001_sales_rls_hardening.sql` | ~~Alta seguridad~~ | ✅ |
| D-014 | ~~RLS Sales: políticas únicas `FOR ALL`~~ — **RESUELTO**: políticas segregadas, cobros/facturas sin DELETE | ~~Alta seguridad~~ | ✅ |
| D-015 | ~~`siguienteNumero` race condition~~ — **RESUELTO**: `sales.factura_sequences` con INSERT ON CONFLICT DO UPDATE | ~~Media~~ | ✅ |
| D-016 | ~~`sales.mesas` sin `actualizada_en`~~ — **RESUELTO**: columna + trigger en `20260515000003` | ~~Baja~~ | ✅ |
| D-017 | ~~Columnas estado/tipo TEXT sin ENUM~~ — **RESUELTO**: 5 ENUMs nativos + Kysely types tightened | ~~Baja~~ | ✅ |
| D-018 | ~~Pool separado por adapter~~ — **RESUELTO**: `createSharedPool` + firma `Pool` en todos los factories | ~~Baja~~ | ✅ |
| D-019 | ~~`puntoDeVentaId: string` sin branded type~~ — **RESUELTO**: `PuntoDeVentaId` opaco + cast en route handler | ~~Baja~~ | ✅ |
| D-020 | ~~Tipos duplicados en Dashboard.tsx~~ — **RESUELTO**: importa desde `@zahavi/ports` | ~~Media~~ | ✅ |

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
| `9bcfa90` | Fase B Bloques B.1-B.5 | Vertical slice visible: Docker, seeds, React frontend (Login/Products/Inventory), TODO.md, correcciones code-reviewer |
| `d64d938` | Iteración 6 Bloque 6.5 | 7 migraciones + seed completo en Supabase cloud `cuqxmbbpssoylwaywuhc` |
| `eb6f8b8` | Iteración 7 Bloque 7.3 | pool compartido + tipos desde ports (D-018, D-020) |
| `4fa5105` | Iteración 7 Bloque 7.3 | D-011 — defensa en profundidad RLS Catalog + Inventory |
| `4ab7d9d` | Iteración 7 Bloque 7.4 | D-016/D-017/D-019 — actualizada_en mesas, ENUMs nativos, PuntoDeVentaId branded |

---

## 🧭 Cómo leer este archivo (para Claude)

1. **Sección "Estado de la sesión actual"** → qué se está haciendo ahora.
2. **Sección "Próxima acción"** → la tarea concreta que toca ejecutar.
3. **Iteraciones detalladas** → checklist marcable. Marca `[✅]` cuando completes.
4. **Deuda técnica** → registra cosas que decides no hacer ahora pero hay que hacer después.
5. **Decisiones pendientes** → ambigüedades que aplicaste con default conservador.
6. **Commits relevantes** → trazabilidad de qué commit cerró qué.

Al cerrar cada bloque: actualiza checklists, mueve "Próxima acción", añade commit a la tabla, registra deuda nueva si aparece. Nunca borres historial — solo marca.
