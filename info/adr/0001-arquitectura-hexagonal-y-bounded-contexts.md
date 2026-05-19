# ADR-0001: Arquitectura Hexagonal y Bounded Contexts como estructura base

- **Estado:** Aceptado
- **Fecha:** 2026-05-05
- **Decisores:** Julian Restrepo (SUPERADMIN / Arquitecto Principal)
- **Categoría:** Arquitectura
- **Relevancia:** Crítica — establece el fundamento de toda la estructura de código

---

## Contexto y problema

Zahavi es un sistema POS para panadería-cafetería en Colombia con topología distribuida:
- 1 planta central de producción (backend centralizado)
- 2+ puntos de venta (múltiples instancias de la app de punto)
- Requisitos de offline-first en puntos de venta
- Integración con proveedores, sistemas de pago, impresoras ESCPOS, auditoría legal
- Seguridad crítica: manejo de dinero, auditoría inmutable, zero-trust

Un monolito tradicional rápidamente se convierte en bola de barro cuando:
- Cambios en reportería impactan la lógica de facturación
- Nuevas integraciones (e.g., printer, payment gateway) requieren refactors profundos
- La lógica de negocio queda acoplada a frameworks (Fastify, React, Supabase SDK)
- Los tests no pueden correr sin base de datos o red
- La seguridad depende de convenios en vez de hacer imposible violarla

El proyecto requiere:
1. **Testabilidad**: tests de dominio sin dependencias externas, rápidos, confiables
2. **Escalabilidad conceptual**: agregar nuevos bounded contexts sin romper los existentes
3. **Reemplazabilidad**: cambiar Supabase por otra DB, React por otro frontend, sin tocar dominio
4. **Seguridad de arquitectura**: hacer imposible, no solo difícil, que se filtre un `service_role` o que se concatene SQL
5. **Claridad de responsabilidades**: cada componente tiene una razón para cambiar

---

## Opciones consideradas

### 1. Monolito modular (por módulo funcional)
**Estructura:** `src/users/`, `src/products/`, `src/inventory/`, cada uno con modelos, controladores, queries, etc.

**Pros:**
- Fácil de empezar (todo en un lugar)
- Tooling estándar (cualquier framework MVC)

**Contras:**
- La lógica de negocio se mezcla con infraestructura (Fastify, Supabase SDK, React)
- Tests son frágiles (requieren mock complicado de dependencias externas)
- Cambios en un módulo acoplan accidentalmente a otros
- Seguridad por convención: si olvidamos validar RLS en un query, falla silenciosamente
- Offline-first requiere duplicar lógica en cliente y servidor

**Riesgo:** A 100 endpoints, la curva de bugs crece cuadráticamente.

### 2. Microservicios desde el inicio
**Estructura:** Servicio Identity, Servicio Catalog, Servicio Sales, etc., cada uno con su DB, API, deploy independiente.

**Pros:**
- Escalabilidad operativa clara
- Equipos pueden trabajar en paralelo

**Contras:**
- Overhead de operaciones (orquestación, observabilidad, testing E2E)
- Latencia de red en operaciones distribuidas
- Consistencia eventual agrega complejidad (sagas, compensaciones)
- Para un equipo pequeño (2-3 engineers), es sobra-ingeniería
- Topología actual (1 central + 2 puntos) no justifica el costo

**Riesgo:** Tres meses en DevOps, cero feature delivery.

### 3. Arquitectura Hexagonal con Bounded Contexts (elegida)
**Estructura:** Monorepo pnpm. Carpeta `domain/` con BCs aislados. Carpeta `application/` con casos de uso. Carpeta `adapters/` con implementaciones intercambiables. `apps/` con presentaciones (API, CLI, web).

**Pros:**
- Dominio puro: tests de lógica sin mocks, rápidos, confiables
- Puertos bien definidos: cambiar Supabase por PostgreSQL directo es trivial
- Offline-first natural: adaptador de SQLite local en cliente, sincronización idempotente
- Escalable a microservicios después si lo requiere (extrae un BC a su propio monorepo)
- Seguridad de arquitectura: es imposible importar Fastify en el dominio (análisis estático)
- SOLID en cada capa: cada clase tiene una responsabilidad

**Contras:**
- Requiere disciplina: sin guardias de linter, alguien mete imports "prohibidos"
- Curva de aprendizaje: DDD y puertos no son estándar (requiere onboarding)
- Más código boilerplate que un monolito naive (pero es código que paga réditos)

**Riesgo:** Si el equipo no entiende el modelo, se degrada a monolito con carpetas innecesarias.
*Mitigación:* Subagente `architect-guardian` valida cada PR, este ADR es referencia.

---

## Decisión

**Se adopta Arquitectura Hexagonal (Ports & Adapters) con Domain-Driven Design.**

La estructura es:

```
packages/
├── domain/
│   ├── shared-kernel/          # Tipos comunes: Money, Quantity, ValueObjects
│   ├── identity/               # BC: usuarios, roles, sesiones, 2FA
│   ├── catalog/                # BC: productos, recetas, combos, escandallo
│   ├── inventory/              # BC: ingredientes, stock, movimientos, alertas
│   ├── production/             # BC: órdenes, lotes, mermas, despachos
│   ├── sales/                  # BC: mesas, órdenes, facturas, pagos, cierre
│   ├── accounting/             # BC: gastos, reportes, dashboards
│   └── auditing/               # BC: log inmutable, analítica forense
├── application/                # Casos de uso, inyección de dependencias
├── ports/                      # Interfaces que cada BC expone y espera
├── adapters/
│   ├── persistence-supabase/
│   ├── persistence-sqlite-offline/
│   ├── messaging-supabase-realtime/
│   ├── printing-escpos/
│   ├── notifications-email/
│   └── secrets-vault/
└── shared/                     # Logger, error handling, utils (sin lógica)

apps/
├── api/                        # HTTP server (Fastify) + RLS
├── web/                        # PWA React + Zustand + TanStack Query
└── cli/                        # CLI admin (oclif)
```

### Principios de diseño

**1. Dependencia hacia adentro (arquitectura limpia)**

```
apps → adapters → application → ports → domain
```

- El dominio es el corazón. Cero imports de frameworks, librerías externas, DB, HTTP.
- `application/` orquesta casos de uso; inyecta puertos (interfaces).
- `adapters/` implementan puertos (e.g., `SupabaseRepository implements IProductRepository`).
- `apps/` son presentaciones (controladores HTTP, componentes React, comandos CLI).

Violación detectada por linter: si ves `import` de Fastify, Supabase SDK, o React en `domain/`, es bug.

**2. Bounded Contexts explícitos**

Cada BC (`identity/`, `catalog/`, `inventory/`, etc.) es:
- Una carpeta con sus modelos de dominio (Entities, Value Objects, Aggregates)
- Sus reglas de negocio en métodos puros
- Sus errores de dominio tipados (`InsufficientStockError`, `InvalidRecipeError`)
- Sin conocer otros BCs (excepto vía puertos/eventos)

Ejemplo: `inventory/` no importa de `sales/`. Si Sales necesita validar stock, invoca un puerto:

```typescript
// domain/sales/CreateOrderUseCase
const isAvailable = await ports.inventoryFacade.checkAvailability(product, quantity);
```

**3. CQRS ligero para reportes**

Writes van al dominio (Commands crean Domain Events → se persisten).
Reads van a una proyección separada:
- No necesita estar 100% sincronizada
- Optimizada para dashboards/reportes
- Tolerante a latencia

Ejemplo: `accounting/GenerateDailyCloseReport` lee de `reports_daily_close` (tabla desnormalizada, eventual consistency).

**4. Domain Events internos**

Cuando algo crítico ocurre (venta completada, receta modificada, stock bajo), se emite un evento:

```typescript
class Order extends Aggregate {
  pay(payment: Payment): void {
    // Validaciones
    this.status = "paid";
    this.addDomainEvent(new OrderPaidEvent(this.id, payment.amount, new Date()));
  }
}
```

El evento es capturado por `application/`, persistido, y puede disparar:
- Notificaciones (email, push)
- Cambios en otros BCs (Accounting registra ingreso)
- Cambios en reportes (actualizar proyección)

Los eventos NO crean acoplamiento: son desacoplados temporalmente.

**5. Offline-First en puntos de venta**

La app de punto (web PWA con React) tiene:
- SQLite local (adapter `persistence-sqlite-offline/`)
- Sincronización bidireccional vía puertos

Cuando el punto reconecta:
- Usa adapter `persistence-supabase/` en lugar de SQLite
- La lógica de aplicación no cambia (ambos adapters implementan `IOrderRepository`)
- Sincronización es idempotente: reenviar la misma venta no crea duplicado

```typescript
// El caso de uso no conoce si es online u offline
class CreateOrderUseCase {
  async execute(input): Promise<Result<Order, DomainError>> {
    const order = Order.create(input);
    await this.orderRepository.save(order);  // ¿SQLite? ¿Supabase? No importa.
    return ok(order);
  }
}
```

**6. Zero-Trust en seguridad**

La arquitectura hace imposibles errores comunes:

- **`service_role` nunca en cliente:** El adapter HTTP en Fastify y el adapter de Supabase usan `service_role` (backend). El cliente usa `anon key` + JWT del usuario. La app de punto también usa `anon key` contra su Supabase local (o relay).
  
- **RLS obligatorio:** Toda tabla nueva incluye RLS en la migración. El dominio no sabe de RLS, pero el adapter `persistence-supabase/` verifica que el usuario tenga permiso vía RLS (la BD lo rechaza si no).

- **SQL parametrizado siempre:** Kysely (query builder tipado) previene inyección por construcción.

- **Errores tipados:** No hay strings sueltos. `throw new InsufficientStockError(...)` vs `throw "error"`.

---

## Consecuencias

### Positivas

1. **Testabilidad:** Tests de dominio corren en <50ms sin DB, sin mocks complicados.
   ```bash
   pnpm test --filter @zahavi/domain
   ```

2. **Mantenibilidad:** Un nuevo miembro entiende "oh, `Order` es en `domain/sales/`" vs. buscar en 5 archivos de un monolito.

3. **Reemplazabilidad:** Cambiar de Supabase a PostgreSQL directo es crear un nuevo adapter y cambiar `pnpm.overrides`. Dominio sin cambios.

4. **Escalabilidad conceptual:** Agregar BC `warehouse-management/` es carpeta nueva + puerto nuevo + casos de uso. No rompemos nada existente.

5. **Seguridad de arquitectura:** Análisis estático detecta violaciones (`eslint-plugin-no-import-from-framework`).

6. **Offline-First sin dudar:** Cambiar adapter en cliente, sincronización manejada por puertos. UI sin cambios.

7. **Auditabilidad:** Domain Events son append-only; cualquier cambio crítico queda en el log inmutable.

### Negativas / Trade-offs

1. **Boilerplate inicial:** Crear un caso de uso requiere clase, interfaz, mapper, test. No es un lambda de 5 líneas. Compensado por tests confiables y cambios seguros después.

2. **Curva de aprendizaje:** DDD no es estándar (la mayoría del mercado hace CRUD). Requiere mentoría inicial (este ADR, subagente `architect-guardian`).

3. **Tentación de shortcuts:** Es fácil "meter lógica en el controlador HTTP" cuando tienes prisa. Requiere disciplina y reviews.

4. **Complejidad de puertos:** Si un caso de uso necesita 5 puertos, la inyección de dependencias puede parecer verbosa. Mitigado con factories.

### Neutras

1. **Tamaño del monorepo:** Crece, pero `pnpm` y `turborepo` lo manejan (hoisting, caché). En 2-3 años, si hay 50 BCs, se migra a monorepo separado por BC sin refactor de código.

2. **Ciclo de desarrollo:** No hay diferencia (mismo `pnpm dev`, mismo CI/CD). La "rigurosidad" no es fricción en workflow.

---

## Referencias

- **Domain-Driven Design** — Eric Evans, 2004. La biblia; este proyecto adopta agregados, eventos, y lenguaje ubicuo.
- **Hexagonal Architecture** — Alistair Cockburn, 2005. Puertos y adaptadores; aislamiento de la lógica de negocio.
- **SOLID Principles** — Robert C. Martin. Cada clase una responsabilidad; aquí aplicado a capas.
- **Clean Architecture** — Robert C. Martin, 2017. Dependencia hacia adentro (capítulo 17 de código limpio).
- **CQRS Pattern** — Greg Young. Separación reads/writes; aquí usada ligera para reportes.
- **Offline-First** — Tristan Penman / Tandem / Ink & Switch. Sincronización idempotente; modelo referencia.
- **Zero-Trust Security** — Google BeyondCorp. RLS + anon key + auditoría; aplicado a POS.

### Documentación interna relacionada

- `docs/domain-model/` — Glossario, aggregates, context map de cada BC.
- `docs/api/openapi.yaml` — Contracts HTTP que adapters implementan.
- `docs/runbooks/` — Operación y debugging.
- Subagente `architect-guardian` — Valida pureza de dominio en PRs.
- Subagente `security-auditor` — Valida RLS, JWT, adaptadores externos.

### Cambios inminentes (roadmap)

- ADR-0002: Strategy de testing (unit/integration/contract/E2E)
- ADR-0003: Manejo de Domain Events (persistencia, sidecars, transacciones distribuidas)
- ADR-0004: Offline-First en cliente (SQLite + sincronización bidireccional)
- ADR-0005: Zero-Trust en detalle (RLS policies, JWT validation, auditoría)

---

## Aprobación

- ✅ Aceptado por Julian Restrepo (SUPERADMIN, Arquitecto Principal) — 2026-05-05
- Sujeto a validación en reviews con `architect-guardian` y `security-auditor`
