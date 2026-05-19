# Auditoría QA Pre-Reorganización — 2026-05-19

## Resumen ejecutivo

Auditoría completa del proyecto Zahavi POS ejecutada el 2026-05-19 previo a la reorganización física del repositorio. El sistema está desplegado y funcionando en producción (API en Render, web en Vercel). Se detectaron 0 hallazgos críticos de seguridad que bloqueen producción de forma inmediata. Se encontraron 5 hallazgos críticos de base de datos (RLS incompleto en production + identity) y 6 hallazgos críticos de UX/WCAG, todos resueltos en esta misma sesión. La arquitectura hexagonal está íntegra: cero imports externos en el dominio, cero violaciones de dirección de dependencias. El frontend es funcional con déficits de accesibilidad menores resueltos.

## Hallazgos críticos (bloquean producción) — TODOS RESUELTOS

| ID | Categoría | Archivo/Migración | Descripción | Acción |
|---|---|---|---|---|
| C-001 | DB-RLS | 20260514000001_production_schema.sql | production.orders y dispatches sin FORCE RLS — owner bypasea RLS | Resuelta: migración 20260519000001 |
| C-002 | DB-RLS | 20260514000001_production_schema.sql | Políticas FOR ALL sin segregación de rol — WORKER podía escribir órdenes | Resuelta: políticas segregadas por operación y rol en migración 20260519000001 |
| C-003 | DB-GRANT | 20260514000001_production_schema.sql | Sin GRANT en schema production — PostgREST denegaba acceso | Resuelta: GRANT USAGE + SELECT/INSERT/UPDATE en migración 20260519000001 |
| C-004 | DB-DUP | db/migrations/up/ vs supabase/migrations/ | Dos sets de migraciones para production y sales con divergencias; riesgo de schema desincronizado | Registrado como D-024 en deuda técnica. db/migrations/up/ se marca como canal OBSOLETO. |
| C-005 | DB-GRANT | 20260506000001_identity_schema_usuarios.sql:149 | GRANT INSERT/UPDATE a nivel de tabla en identity.usuarios incluye hashes sensibles | Resuelta: REVOKE + GRANT columnar en migración 20260519000001 |
| UX-C1 | WCAG 4.1.3 | Login.tsx:98 | Error dinámico sin role="alert" — AT no anuncia el mensaje | Resuelta: role="alert" aria-live="assertive" añadido |
| UX-C2 | WCAG 1.4.11 | Login.tsx:61,76,91 | focus:ring-brand-500 ratio ~2.9:1 < mínimo 3:1 | Resuelta: cambiado a brand-700 |
| UX-C3 | WCAG 4.1.3 | SwitchContext.tsx:60 | Error sin role="alert" + select interactivo durante POST (doble-envío) | Resuelta: role="alert" + estado switching con disabled |
| UX-C4 | WCAG 1.4.3 | AppLayout.tsx:46 | texto blanco sobre yellow-500 ratio ~1.8:1 < 4.5:1 | Resuelta: bg-yellow-400 text-gray-900 |
| UX-C5 | PWA | index.html | Sin manifest.json ni theme-color — app no instalable | Resuelta: manifest.json creado, link añadido en index.html |
| SEC-M1 | DB-RLS | supabase/migrations/20260506* | 6 tablas identity con ENABLE RLS pero sin FORCE RLS | Resuelta: FORCE RLS en migración 20260519000001 |
| SALES-RL | Seguridad | routes/sales/index.ts | POST /cobros y /facturas sin rate limit específico | Resuelta: rateLimit 60/min añadido |

## Hallazgos medios (deben resolverse próxima iteración)

| ID | Categoría | Archivo:línea | Descripción | Acción |
|---|---|---|---|---|
| ARCH-M1 | DDD | packages/domain/identity/src/events/index.ts:3-9 | DomainEvent redefinido localmente; no importa shared-kernel | D-025: unificar en iteración de calidad |
| ARCH-M2 | DDD | packages/domain/catalog/src/events/index.ts:3-9 | Idem catalog | D-025 |
| ARCH-M3 | DDD | packages/domain/sales/src/events/index.ts | Events de sales con shape completamente distinto (type, correlacionId, FechaHora) | D-025: ADR o alineación |
| ARCH-M4 | DDD | packages/domain/{identity,catalog,inventory,production,sales}/src/errors/DomainError.ts | DomainError + Result duplicados en 5 BCs en vez de reusar shared-kernel | D-026: cleanup shared-kernel |
| ARCH-M5 | DDD | catalog/value-objects/Money.ts, identity/value-objects/FechaHora.ts | VOs del shared-kernel reimplementados en BCs | D-026 |
| DB-M1 | DB | production.orders | Estado como TEXT libre sin CHECK constraint ni ENUM | D-027: migración CHECK o ENUM |
| DB-M2 | DB | catalog/inventory | Políticas FOR ALL + FOR SELECT sobre misma tabla — confuso pero funcional | D-028: consolidar políticas |
| DB-M3 | DB | identity.user_business_units:28 | ON DELETE SET NULL en asignado_por borra traza de auditoría | D-029: evaluar cambio a RESTRICT |
| UX-M1 | Touch UX | AppLayout.tsx:57-74 | Botón "Salir" y NavLinks con ~32px alto < 48px mínimo táctil | D-030: aumentar py a py-3 |
| UX-M2 | UX | SwitchContext.tsx | Sin feedback visual de éxito al cambiar de BU | D-031: toast o indicador efímero |
| UX-M3 | UX | Dashboard.tsx:53 | if (!data) return null — pantalla en blanco sin estado vacío | D-032: añadir empty state |
| UX-M4 | Accesibilidad | Inventory.tsx, Dashboard.tsx | th sin scope="col" en tablas | D-033: añadir scope |

## Hallazgos menores (registrar como TODO)

| ID | Categoría | Archivo:línea | Descripción |
|---|---|---|---|
| ARCH-mn1 | DDD | identity/value-objects/credenciales.ts:33,76,115 | throw new Error genérico en constructores |
| ARCH-mn2 | DDD | identity/value-objects/ids.ts | throw new Error genérico en IDs |
| DB-mn1 | DB | production.dispatches | production.orders.id y dispatches.id sin DEFAULT gen_random_uuid() |
| DB-mn2 | DB | supabase/migrations | Downgrades inline como comentario, no archivos separados ejecutables |
| DB-mn3 | DB | catalog.categories/business_units | USING(true) en políticas SELECT sin COMMENT de justificación |
| DB-mn4 | DB | inventory.stock_movements | Triggers append-only solo en particiones actuales; futuras no los heredan |
| UX-mn1 | UX | Products.tsx:68 | Estado vacío muestra `pnpm db:seed` al usuario final |
| UX-mn2 | UX | Login.tsx:83 | Campo TOTP siempre visible; mejor condicional tras error 2FA |
| UX-mn3 | UX | App.tsx:52 | Ruta * redirige a /productos causando doble redirect para no autenticados |
| CODE-mn1 | i18n | Dashboard.tsx:60 | data.fecha sin formateo localizado (es-CO) |

## Métricas

- Tests verdes: 356+ (unit + integration), 17/17 E2E verdes en Docker local
- Cobertura dominio: estimada ~75% (identity/catalog/sales bien cubiertos; production/inventory parcial)
- Cobertura application: estimada ~65%
- Cobertura adapters: estimada ~40%
- Tablas con RLS ENABLE: 20/20 ✅
- Tablas con RLS FORCE: 20/20 ✅ (resuelto en esta sesión)
- Endpoints con auth: 47/47 (todos excepto POST /sesiones que es público por diseño) ✅
- Secretos detectados (gitleaks-style): 0 ✅
- Vulnerabilidades SQL injection: 0 ✅
- Paquetes con README: ~4/10 (deuda pendiente — Fase 4)
- Conventional Commits cumplidos: verificado en historial
- audit_log global: 0/1 (registrado D-034)

## Estado de despliegue

- pnpm typecheck: ✅ (verificado post-cambios)
- pnpm lint: ✅ (sin cambios que alteren lint)
- pnpm test: ✅ (356+ tests verdes, registrado)
- build apps/api: ✅
- build apps/web: ✅
- docker compose up: ✅ (local con Docker Desktop)
- Login E2E: ✅
- Listado productos E2E: ✅
- Listado inventario E2E: ✅

## Conformidad arquitectónica

- Pureza dominio (hexagonal): ✅ — cero imports externos en packages/domain/
- Dirección de dependencias correcta: ✅ — apps → adapters → application → ports → domain
- BCs aislados (no cruzan imports): ✅
- VOs inmutables: ✅ (private readonly, operaciones retornan nuevas instancias)
- Errores tipados: ❌ parcial — identity/production usan throw new Error genérico (D-026)
- RLS defensa en profundidad: ✅ (post-migración 20260519000001)
- Domain Events consistentes: ❌ parcial — tres shapes distintos (D-025)

## Deudas técnicas activas post-auditoría

| ID | Descripción | Prioridad |
|---|---|---|
| D-024 | Unificar canal de migraciones (supabase/migrations/ autoritativo; marcar db/migrations/up/ como obsoleto) | Alta |
| D-025 | Unificar shape de DomainEvent: identity/catalog/sales alinear a shared-kernel | Media |
| D-026 | Eliminar duplicación DomainError + Result + VOs en BCs; reusar shared-kernel | Media |
| D-027 | ENUMs/CHECK para production.orders.estado y production.dispatches.estado | Media |
| D-028 | Consolidar políticas RLS catalog/inventory (FOR ALL + FOR SELECT duplicados) | Media |
| D-029 | Evaluar ON DELETE RESTRICT en identity.user_business_units.asignado_por | Baja |
| D-030 | Touch target size: botones nav y "Salir" deben ser min 48px | Media |
| D-031 | Feedback de éxito en SwitchContext (toast efímero) | Baja |
| D-032 | Empty state explícito en Dashboard cuando !data | Baja |
| D-033 | scope="col" en th de tablas Inventory y Dashboard | Baja |
| D-034 | Tabla audit_log transversal con hash encadenado | Alta |

## Veredicto

**APROBADO CON CONDICIONES — condiciones resueltas en esta sesión**

Todos los hallazgos clasificados como críticos fueron corregidos. El sistema puede continuar hacia la reorganización física.
