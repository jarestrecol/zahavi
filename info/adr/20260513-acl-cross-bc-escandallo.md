# ADR-0002: Patrón Anti-Corruption Layer (ACL) cross-BC para CalcularEscandallo

- **Estado:** Aceptado
- **Fecha:** 2026-05-13
- **Decisores:** Julian Restrepo (SUPERADMIN / Arquitecto Principal)
- **Categoría:** Arquitectura, Integración cross-BC
- **Relevancia:** Alta — establece el patrón para consultas entre BCs sin violar pureza del dominio

---

## Contexto y problema

El caso de uso `CalcularEscandallo` (en BC Catalog) necesita los costos actuales de ingredientes para calcular el costo de una receta. Estos ingredientes pertenecen al BC Inventory.

Según la arquitectura DDD y las reglas de pureza del proyecto:
- El dominio de `catalog` debe ser puro: cero imports de `domain-inventory`.
- El dominio de `inventory` debe ser independiente: no es responsabilidad de Catalog conocer su estructura.

Problema técnico: ¿Cómo obtiene Catalog los costos sin contaminar su dominio ni crear un endpoint HTTP innecesario (ambos BCs están en el mismo monolito)?

Contexto adicional:
- Ambos BCs comparten la misma BD (Supabase / PostgreSQL).
- No hay comunicación asíncrona o eventual consistency requerida; es una consulta de lectura.
- El costo de ingrediente es un dato que cambia lentamente (pocas veces al día).

---

## Opciones consideradas

### 1. Anti-Corruption Layer (ACL) con adapter de persistencia

**Descripción:** Crear `ConsultorDeCostosDeIngredientesSupabase` en `packages/adapters/persistence-supabase/src/catalog/`. Esta clase:
- Implementa el puerto `IConsultorDeCostosDeIngredientes` definido en `packages/ports/src/catalog/consultores.ts`
- Recibe `Kysely<InventoryDatabase>` en su constructor (acceso directo a tablas de Inventory en la BD)
- Consulta `inventory.ingredients` para obtener `costo_unitario_actual`
- Usa tipos de `domain-catalog` (IngredientId, Money) — NO importa de `domain-inventory`

**Pros:**
- Dominio de Catalog permanece puro (solo ve la interfaz del puerto).
- Catalog no conoce el schema de Inventory (cambios de schema se aislan en el adapter).
- Es una consulta de lectura eficiente (una línea SQL a la BD compartida).
- Patrón reutilizable para otros cross-BC reads (e.g., Accounting lee Stock, Sales lee Costos).
- Facilita testing: mock del puerto es trivial.

**Contras:**
- El adapter conoce ambos schemas (de Catalog e Inventory). Si Inventory cambia, hay que actualizar el adapter.
- Introduce una dependencia implícita: si alguien borra la tabla `inventory.ingredients`, los tests de Catalog fallan en BD de integración.

### 2. HTTP inter-BC (Inventory expone endpoint, Catalog lo consume)

**Descripción:** Inventory crea un endpoint `GET /admin/internal/ingredientes/:id/costo` que Catalog consume vía HTTP. El adapter de Catalog hace `fetch()` al localhost.

**Pros:**
- Máxima separación de concerns.
- Simula lo que pasaría si Inventory fuera un servicio externo.

**Contras:**
- Overhead innecesario para un monolito (latencia de red, serialización, desserialización).
- Complica tests (requiere mock de servidor HTTP o test de integración con dos servidores).
- Si el servidor HTTP está down, falla algo que hoy es una consulta SQL; fragilidad.
- Requiere autenticación inter-servicio (JWT, mTLS) para evitar que cualquiera llame el endpoint.
- Viola el principio YAGNI: es engineering para un problema futuro (separación a microservicios) que hoy no existe.

### 3. Duplicación: agregar costos de ingredientes a BC Catalog

**Descripción:** En lugar de consultar Inventory, Catalog mantiene su propia copia de costos. Se sincronizan vía Domain Events: cuando Inventory cambia un costo, emite `IngredienteCostoActualizadoEvent` que Catalog escucha y proyecta.

**Pros:**
- Máxima autonomía: Catalog no depende en tiempo de lectura de Inventory.
- Eventual consistency natural: tolerancia a latencia es explícita.

**Contras:**
- Complejidad: requiere event handlers, proyecciones, eventual consistency logic.
- Riesgo de divergencia: ¿qué pasa si Inventory emitió el evento pero la proyección no se guardó?
- Overhead de operación: hay que monitorear la sincronización, tener alertas.
- Para un cálculo simple (escandallo = suma de costos), es sobra-ingeniería.
- El dato es "propiedad" de Inventory, duplicarlo es violar SRP.

---

## Decisión

**Se adopta el patrón Anti-Corruption Layer (ACL) con adapter de persistencia para consultas cross-BC.**

### Arquitectura concreta

1. **Define el puerto en BC Catalog:**

   ```typescript
   // packages/ports/src/catalog/consultores.ts
   export interface IConsultorDeCostosDeIngredientes {
     obtenerCostoPorIngrediente(ingredienteId: IngredientId): Promise<Money | null>;
     obtenerCostosPorIngredientes(ids: IngredientId[]): Promise<Map<IngredientId, Money>>;
   }
   ```

   (El puerto vive en `packages/ports/`, NO en `packages/domain/`. Es una interfaz que el dominio espera, pero no forma parte del dominio puro.)

2. **Implementa en el adapter de persistencia:**

   ```typescript
   // packages/adapters/persistence-supabase/src/catalog/ConsultorDeCostosDeIngredientesSupabase.ts
   
   export class ConsultorDeCostosDeIngredientesSupabase implements IConsultorDeCostosDeIngredientes {
     constructor(private inventoryDb: Kysely<InventoryDatabase>) {}

     async obtenerCostoPorIngrediente(id: IngredientId): Promise<Money | null> {
       const row = await this.inventoryDb
         .selectFrom('ingredients')
         .select('costo_unitario_actual')
         .where('id', '=', id.value)
         .executeTakeFirst();

       return row ? Money.of(row.costo_unitario_actual, 'COP') : null;
     }

     async obtenerCostosPorIngredientes(ids: IngredientId[]): Promise<Map<IngredientId, Money>> {
       const rows = await this.inventoryDb
         .selectFrom('ingredients')
         .select(['id', 'costo_unitario_actual'])
         .where('id', 'in', ids.map(id => id.value))
         .execute();

       return new Map(rows.map(row => [
         IngredientId.of(row.id),
         Money.of(row.costo_unitario_actual, 'COP')
       ]));
     }
   }
   ```

3. **Inyecta en el caso de uso:**

   ```typescript
   // packages/application/src/catalog/CalcularEscandallo.usecase.ts
   
   export class CalcularEscandallo {
     constructor(
       private recipeRepository: IRecipeRepository,
       private consultorCostos: IConsultorDeCostosDeIngredientes
     ) {}

     async execute(input: CalcularEscandalloDTOInput): Promise<Result<CalcularEscandalloDTOOutput, DomainError>> {
       const recipe = await this.recipeRepository.getById(input.recipeId);
       if (!recipe) return err(new RecipeNotFoundError(input.recipeId));

       const costos = await this.consultorCostos.obtenerCostosPorIngredientes(
         recipe.ingredientes.map(line => line.ingredienteId)
       );

       const escandallo = recipe.calcularEscandallo(costos);
       return ok(escandallo);
     }
   }
   ```

4. **Crear un Pool de pg compartido en el factory:**

   ```typescript
   // packages/adapters/persistence-supabase/src/catalog/factory.ts
   
   export async function createCatalogAdapters(databaseUrl: string) {
     // Pool compartido entre Catalog e Inventory
     const pool = new PgPool({ connectionString: databaseUrl });

     const catalogDb = new Kysely<CatalogDatabase>({ dialect: new PostgresDialect({ pool }) });
     const inventoryDb = new Kysely<InventoryDatabase>({ dialect: new PostgresDialect({ pool }) });

     const catalogRepository = new CatalogRepositorySupabase(catalogDb);
     const recipeRepository = new RecipeRepositorySupabase(catalogDb);
     const consultorCostos = new ConsultorDeCostosDeIngredientesSupabase(inventoryDb);

     return {
       catalogRepository,
       recipeRepository,
       consultorCostos,
     };
   }
   ```

### Puntos de atención

- **Schema ownership:** El adapter "ve" `inventory.ingredients` para lectura solamente. Cambios de schema en Inventory requieren actualizar el adapter; no es secreto, es parte del costo de integración.
- **Transacciones:** Si CalcularEscandallo fuera parte de una transacción mayor (ej. crear una orden y calcular costo simultáneamente), ambas Kysely instances comparten el pool, por lo que pueden usar transacciones explícitas.
- **Testing:** En tests, se puede mockear `IConsultorDeCostosDeIngredientes` sin tocar BD. En integration tests, se ejecuta con BD real.

---

## Consecuencias

### Positivas

1. **Pureza de dominio:** Catalog no importa nada de Inventory. El test unitario de `Recipe.calcularEscandallo()` no necesita saber de BD.

2. **Eficiencia:** Es una consulta SQL directa; cero overhead de serialización o red.

3. **Reutilizable:** Otros BCs (Accounting, Sales) pueden usar el mismo patrón para consultas cross-BC.

4. **Aislamiento de cambios:** Si Inventory cambia el nombre de `costo_unitario_actual` a `precio_costo`, el cambio está localizado en `ConsultorDeCostosDeIngredientesSupabase`, no esparcido en `domain-catalog`.

5. **Testeable:** Mock del consultor es una clase que implementa una interfaz. No hay magia.

### Negativas / Trade-offs

1. **Acoplamiento implícito a schema:** El adapter conoce ambos schemas. Si el DBA rename una columna en Inventory sin avisar, el test de integración de Catalog falla silenciosamente hasta que se detecta.

   *Mitigación:* Tests de integración en el adapter (ej. `test('ConsultorDeCostosDeIngredientesSupabase obtiene costo de tabla ingredients')`) garantizan que el schema existe.

2. **Dependencia de disponibilidad de Inventory:** Si la tabla `inventory.ingredients` está locked o slow, CalcularEscandallo se bloquea.

   *Mitigación:* En BD compartida, es raro; pero si fuese remota, habría que agregar timeout y circuit breaker (ver ADR sobre resilencia cross-BC si surge).

3. **Documentación:** Hay que documentar en este ADR que `ConsultorDeCostosDeIngredientesSupabase` es un ACL y por qué consulta schema de Inventory.

### Riesgos a monitorear

- Cambios de schema en Inventory (`ingredients` tabla o `costo_unitario_actual` columna) — requiere actualización en el adapter.
- Rendimiento: si CalcularEscandallo se llama en bucle (ej. generando reportes), la consulta es repetida. Considerar caché en memoria si es bottleneck.
- Circular dependencies: en el futuro, si Inventory necesita algo de Catalog, hay que garantizar que no cree ciclo.

---

## Referencias

- **Anti-Corruption Layer (ACL)** — Eric Evans, Domain-Driven Design, capítulo 14. Patrón para traducir/adaptar entre BCs sin contaminar dominios.
- **Strangler Pattern** — Martin Fowler. Aunque aquí no es aplicable (no es una migración), el concepto de ACL viene de ahí.
- **ADR-0001: Arquitectura Hexagonal y Bounded Contexts** — Establece que BCs no se importan directamente.

### Documentación interna relacionada

- `packages/ports/src/catalog/consultores.ts` — Definición de `IConsultorDeCostosDeIngredientes`.
- `packages/adapters/persistence-supabase/src/catalog/ConsultorDeCostosDeIngredientesSupabase.ts` — Implementación del ACL.
- `packages/domain-catalog/src/RecipeAggregate.calcularEscandallo()` — Usa el consultor inyectado.
- `docs/domain-model/catalog/context-map.md` — Documenta relación Catalog ↔ Inventory.

### Cambios inminentes

- Documentación de `context-map` global (cómo Catalog, Inventory, Sales, Accounting se integran).
- Si hay otros cross-BC reads, crear `ConsultorDe...Supabase` siguiendo este patrón.

---

## Aprobación

- ✅ Aceptado por Julian Restrepo (SUPERADMIN, Arquitecto Principal) — 2026-05-13
- Implementación: `ConsultorDeCostosDeIngredientesSupabase.ts` + tests en `persistence-supabase/`.
- Documentación: actualizar `docs/domain-model/catalog/context-map.md` con relación de lectura a Inventory.
