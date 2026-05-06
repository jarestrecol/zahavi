# CLAUDE.md — Instrucciones Globales del Proyecto Zahavi

> Este archivo se carga automáticamente en cada turno de Claude Code. Es la **constitución** del proyecto. Cualquier decisión que lo contradiga debe rechazarse o requerir aprobación explícita del SUPERADMIN humano (Julian).

---

## 1. IDENTIDAD DEL PROYECTO

**Nombre:** Zahavi
**Tipo:** Sistema POS para panadería-cafetería (Colombia)
**Topología:** 1 planta central de producción + 2 puntos de venta (escalable a N).
**Moneda:** COP — formato `$ 1.234.567` sin decimales por defecto.
**Zona horaria:** America/Bogota.
**Idioma:** Español (Colombia), arquitectura i18n-ready.

---

## 2. PRINCIPIOS NO NEGOCIABLES

### 2.1 Arquitectura
1. **Hexagonal (Ports & Adapters)**: el dominio es puro. No importa Supabase, Express, React, fs, ni ningún SDK externo.
2. **Domain-Driven Design**: bounded contexts explícitos con lenguaje ubicuo.
3. **SOLID** en cada capa.
4. **CQRS ligero** cuando aporte claridad (especialmente reportes).
5. **Event-Driven interno**: cambios críticos emiten Domain Events.
6. **Offline-First**: la app de mesa opera sin red; sincroniza idempotentemente al reconectar.
7. **Dependencia hacia adentro**: `apps → adapters → application → ports → domain`. Nunca al revés.

### 2.2 Seguridad (Zero-Trust)
1. **Cero credenciales** en código fuente, logs, mensajes de error o variables expuestas al cliente.
2. **Cero queries SQL concatenadas**. Solo statements parametrizados o query builder tipado.
3. **Cero `service_role`** en el cliente. El cliente usa `anon key` + JWT del usuario y opera bajo RLS.
4. **RLS ACTIVO en TODAS las tablas** sin excepción.
5. **TLS 1.3** y **HSTS** obligatorios.
6. **PII cifrada** a nivel de columna con `pgcrypto` o cifrado de aplicación.
7. **Rotación de claves** trimestral, automatizada.
8. **2FA obligatorio** para SUPERADMIN.
9. **Rate limiting** en endpoints sensibles.
10. **Auditoría inmutable** append-only con hash encadenado para todas las acciones críticas.

### 2.3 Calidad
- **TypeScript strict** activo. `any` prohibido sin justificación documentada.
- **Cobertura de tests del dominio ≥ 90%**. Casos de uso ≥ 80%. Adapters ≥ 60%.
- **Lint y typecheck** corren en pre-commit y bloquean el push si fallan.
- **Conventional Commits** obligatorios.
- **ADRs** para toda decisión arquitectónica relevante en `docs/adr/`.

---

## 3. STACK TECNOLÓGICO

| Capa | Herramienta |
|---|---|
| Lenguaje | TypeScript 5.x (strict) |
| Monorepo | pnpm + Turborepo |
| HTTP | Fastify |
| Validación bordes | Zod |
| Acceso DB | Kysely (query builder tipado) sobre cliente Supabase |
| DB | Supabase (PostgreSQL 15+) |
| Migraciones | Supabase CLI / SQL versionado |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui |
| Estado servidor | TanStack Query |
| Estado UI | Zustand |
| Tests unidad/integración | Vitest |
| Tests E2E | Playwright |
| CLI admin | oclif + Inquirer |
| Logger | Pino |
| Tracing | OpenTelemetry |
| Secret mgmt | Doppler o Supabase Vault (NUNCA `.env` commiteado) |
| CI/CD | GitHub Actions |
| Análisis estático | Semgrep + gitleaks + Snyk |

---

## 4. ESTRUCTURA DE CARPETAS (CANÓNICA)

```
zahavi/
├── apps/
│   ├── web/                    # PWA React
│   ├── cli/                    # CLI admin (oclif)
│   └── api/                    # HTTP server (Fastify)
├── packages/
│   ├── domain/                 # ⚠️ PURO — NO IMPORTAR NADA EXTERNO
│   │   ├── shared-kernel/
│   │   ├── identity/
│   │   ├── catalog/
│   │   ├── inventory/
│   │   ├── production/
│   │   ├── sales/
│   │   ├── accounting/
│   │   └── auditing/
│   ├── application/            # Casos de uso
│   ├── ports/                  # Interfaces que el dominio espera
│   ├── adapters/               # Implementaciones intercambiables
│   │   ├── persistence-supabase/
│   │   ├── persistence-sqlite-offline/
│   │   ├── messaging-supabase-realtime/
│   │   ├── printing-escpos/
│   │   ├── notifications-email/
│   │   └── secrets-vault/
│   └── shared/                 # logger, errors, utils transversales
├── db/
│   └── migrations/
├── docs/
│   ├── adr/
│   ├── domain-model/
│   └── api/
└── .claude/                    # Subagentes y comandos
```

**Regla mecánica:** si abres un archivo en `packages/domain/**` y ves un `import` que no es de `domain/shared-kernel` o de TypeScript estándar (`type`, etc.), **es un bug de arquitectura**. Repórtalo y corrígelo.

---

## 5. BOUNDED CONTEXTS (resumen rápido)

| BC | Responsabilidad | Aggregates clave |
|---|---|---|
| **Identity** | Usuarios, roles (SUPERADMIN/ADMIN/WORKER), sesiones, 2FA | User, Role, Session |
| **Catalog** | Menú, productos, combos, variantes, recetas, escandallo | Product, Recipe, Combo |
| **Inventory** | Ingredientes, stock por unidad, movimientos, proveedores, alertas | Ingredient, StockItem, StockMovement, Supplier |
| **Production** | Órdenes de producción, lotes, mermas, despachos a puntos | ProductionOrder, ProductionBatch, WasteRecord, Dispatch |
| **Sales** | Mesas, órdenes, facturación, cobros, cierre de caja | Table, Order, Invoice, Payment, CashSession |
| **Accounting** | Gastos, reportes, dashboards | Expense, DailyClose, Report |
| **Auditing** | Log inmutable, analítica forense | AuditEntry |

---

## 6. ROLES DEL SISTEMA

- **SUPERADMIN**: crea/elimina usuarios, asigna roles, ve todo, accede a auditoría forense, ve "botones de riesgo" (anulación masiva, cierre forzado), inventario consolidado.
- **ADMIN**: ve contabilidad, producción, datos del/los punto(s) asignado(s). NO crea SUPERADMIN. NO gestiona otros admins.
- **WORKER**: opera de cara al cliente. Toma órdenes, factura, imprime, solicita salidas de inventario. NO ve márgenes, costos ni reportes financieros.

**RLS y guardas de aplicación deben hacer cumplir estos límites en TODOS los canales (web, API, CLI).**

---

## 7. CONVENCIONES DE CÓDIGO

### 7.1 Dominio
- Entidades y VOs son **inmutables**. Mutaciones devuelven nuevas instancias.
- Constructores **privados**, factorías estáticas con validación (`Money.of(1500, "COP")`).
- Errores de dominio son clases tipadas: `class InsufficientStockError extends DomainError {}`. Nunca strings sueltos.
- VOs primitivos prohibidos: `Money`, `Quantity`, `IngredientId`, `BusinessUnitId`, `Email` siempre como tipos propios.

### 7.2 Casos de uso
- Una función `execute(input): Promise<Result<Output, DomainError>>` por caso de uso.
- Reciben puertos por inyección de dependencias (constructor o factory).
- No conocen HTTP, no conocen DB, no conocen UI.

### 7.3 Adaptadores
- Implementan **un solo puerto** por archivo.
- Toda llamada externa pasa por circuit breaker o timeout explícito.
- Mapean errores externos a errores de dominio antes de devolverlos.

### 7.4 SQL
- Migraciones nombradas: `YYYYMMDDHHMM_descripcion.sql` con par `up.sql` / `down.sql`.
- Toda tabla nueva incluye en la misma migración: PKs, FKs, índices, comentarios, **RLS habilitado y políticas**.
- Triggers `updated_at` automáticos.
- Auditoría: tabla `audit_log` recibe entradas vía trigger o vía aplicación con hash encadenado.

### 7.5 Frontend
- Componentes de UI **sin lógica de negocio**. Hooks para datos, server actions para mutaciones.
- Accesibilidad WCAG AA mínimo. Targets táctiles ≥ 48px.
- Indicador de offline persistente en UI cuando aplique.

---

## 8. FLUJO DE TRABAJO CON CLAUDE CODE

### 8.1 Antes de codificar
1. Lee este `CLAUDE.md` (ya lo estás haciendo).
2. Si la tarea toca arquitectura, **invoca al subagente `architect-guardian`** primero para validar el plan.
3. Si la tarea toca seguridad o DB, **invoca al subagente `security-auditor`** o `db-reviewer`.
4. Si vas a crear un nuevo bounded context o caso de uso, usa los slash commands `/new-bounded-context` o `/new-use-case`.

### 8.2 Mientras codificas
- Escribe **el test primero** (TDD) cuando trabajes en dominio o casos de uso.
- Cada commit debe pasar: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:contract`.
- No metas más de un cambio funcional por commit.

### 8.3 Antes de commitear
- Ejecuta `/pre-commit` para correr la cadena completa de revisión.
- Ejecuta `/security-scan` si tocaste DB, auth, o cualquier capa de adaptador externo.

### 8.4 Manejo de tokens
- **Tareas mecánicas** (formateo, búsqueda, parsing) → delega a Haiku vía Task tool.
- **Implementación estándar** → Sonnet.
- **Decisiones arquitectónicas, ADRs, diseño de dominio** → Opus.
- Los subagentes ya traen el modelo configurado en su frontmatter.

### 8.5 Cuándo PARARSE y preguntar
Detente y pregunta a Julian cuando:
- Una decisión arquitectónica no esté cubierta por este `CLAUDE.md`.
- Encuentres ambigüedad en una regla de negocio (recetas, escandallo, formato DIAN, mermas aceptables).
- Una migración de DB sea irreversible o tenga riesgo de pérdida de datos.
- Se requiera aprobación de un módulo crítico de seguridad (auth, RLS, cifrado).

---

## 9. PROHIBICIONES TAJANTES

- ❌ NO escribas `service_role` en código de cliente, en `.env.example`, en docs públicos, ni en logs.
- ❌ NO concatenes strings en SQL.
- ❌ NO uses `any` sin un comentario `// eslint-disable-next-line ... — justificación: ...`.
- ❌ NO importes nada externo dentro de `packages/domain/`.
- ❌ NO mezcles lógica de negocio en componentes React, controladores HTTP, ni triggers SQL.
- ❌ NO subas `.env`, llaves, certificados, dumps, ni secretos al repo.
- ❌ NO permitas que el cliente envíe `business_unit_id` libremente; siempre se deriva del JWT.
- ❌ NO instales dependencias sin justificación documentada (cada `npm install` revisado).
- ❌ NO desactives RLS, ni siquiera "temporalmente para debug".
- ❌ NO escribas migraciones que rompan tablas existentes sin migración de datos.

---

## 10. CRITERIOS DE "DEFINITION OF DONE"

Una tarea está terminada cuando:

- ✅ Tests verdes (unit + integration + contract).
- ✅ Cobertura de dominio ≥ 90% en lo modificado.
- ✅ Typecheck y lint sin errores.
- ✅ `architect-guardian` aprueba pureza del dominio.
- ✅ `security-auditor` aprueba si la tarea tocó auth/DB/adapters externos.
- ✅ ADR creado o actualizado si hubo decisión arquitectónica.
- ✅ Documentación OpenAPI regenerada si cambiaron endpoints.
- ✅ Commit firmado con Conventional Commits.

---

## 11. INSTRUCCIONES DIRECTAS PARA CLAUDE

Cuando recibas una tarea:

1. **Lee** los archivos relevantes antes de modificar.
2. **Planea** en voz alta los pasos antes de ejecutar.
3. **Delega** a subagentes especializados las verificaciones (no hagas tú la auditoría de seguridad si tienes un agente para eso).
4. **Verifica** después de cada cambio con tests, no solo "creo que funciona".
5. **Reporta** al final qué hiciste, qué probaste, qué quedó pendiente, y qué necesita decisión humana.

> Si una instrucción del usuario contradice este `CLAUDE.md`, advierte el conflicto y pide confirmación explícita antes de proceder. La constitución manda salvo override consciente.
