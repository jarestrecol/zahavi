# ADR-0003: businessUnitId derivado del JWT (Zero-Trust en Catalog de datos)

- **Estado:** Aceptado — implementación core completa (JWT + caso de uso + endpoint); RLS defense-in-depth pendiente (D-011)
- **Fecha:** 2026-05-13
- **Decisores:** Julian Restrepo (SUPERADMIN / Arquitecto Principal)
- **Categoría:** Seguridad, Autorización
- **Relevancia:** Crítica — bloquea habilitación de WORKER y exposición a producción

---

## Contexto y problema

### El requisito de seguridad

Según el principio Zero-Trust del proyecto (CLAUDE.md §2.2):

> El cliente **nunca debe enviar** `business_unit_id` libremente. Debe **derivarse del JWT**.

Cada usuario pertenece a una o más unidades de negocio (puntos de venta, planta central). Un ADMIN puede acceder a su(s) unidad(es) asignada(s); un SUPERADMIN accede a todas.

Los endpoints de Inventory (`/movimientos/ingreso`, `/salida`, `/merma`, `/ajustes`, `/stock`, `/historico`) necesitan `businessUnitId` para:
- Acotar qué stock ve/modifica el actor (RLS a nivel aplicación).
- Prevenir que un ADMIN del punto A vea el stock del punto B.
- Crear registros de auditoría con la unidad correcta.

### Situación actual (problema)

En los handlers HTTP de Inventory:

```typescript
export const postMovimientoIngreso = async (req: FastifyRequest, reply: FastifyReply) => {
  // TODO(SEC): businessUnitId debe derivarse del JWT, no venir del body
  const { businessUnitId, ...} = req.body;
  // ...
};
```

**Problemas:**
1. El cliente puede enviar `businessUnitId` fabricado (ej. `POST /movimientos/ingreso { businessUnitId: "unidad-rival" }`).
2. Si el JWT no contiene claims de autorización, no hay forma de validar si el usuario accede solo su(s) unidad(es).
3. Los endpoints solo son accesibles a ADMIN/SUPERADMIN en la implementación actual. Cuando se habilite WORKER, esto es una brecha de seguridad.
4. Incumple el principio de CLAUDE.md: "Cero queries SQL concatenadas. Cero `service_role` en cliente. **Cero credenciales en cliente.**"

### Raíz del problema

El JWT actual (generado en `IniciarSesion`):

```typescript
// Payload actual
{
  sub: "user-uuid",
  sesion_id: "session-uuid",
  zahavi_rol: "ADMIN" | "WORKER" | "SUPERADMIN"
}
```

**Falta:** Array de `business_unit_id` a las que el usuario tiene acceso.

---

## Opciones consideradas

### 1. Derivar businessUnitId del JWT con claim `zahavi_business_units` (elegida)

**Descripción:**

Modificar el JWT para incluir un claim de autorización:

```typescript
{
  sub: "user-uuid",
  sesion_id: "session-uuid",
  zahavi_rol: "ADMIN" | "WORKER" | "SUPERADMIN",
  zahavi_business_units: string[]  // Array de UUID de unidades
}
```

**En los handlers:**

```typescript
export const postMovimientoIngreso = async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user.sub;
  const userRole = req.user.zahavi_rol;
  const allowedUnits = req.user.zahavi_business_units;

  // Parse body (sin businessUnitId)
  const input = MovimientoIngresoSchema.parse(req.body);

  // Derivar la unidad a usar
  let businessUnitId: BusinessUnitId;
  if (userRole === "SUPERADMIN") {
    // SUPERADMIN puede especificar una unidad de las permitidas, o usar parámetro de query
    businessUnitId = input.targetBusinessUnitId || allowedUnits[0];
  } else if (userRole === "ADMIN" || userRole === "WORKER") {
    // Solo pueden usar su unidad asignada
    businessUnitId = allowedUnits[0]; // Asumen que cada ADMIN/WORKER tiene una unidad
  }

  // Validar que la unidad está en el JWT
  if (!allowedUnits.includes(businessUnitId.value)) {
    return reply.forbidden("No tienes acceso a esta unidad");
  }

  const useCase = new RegistrarMovimientoIngreso(/* adapters */);
  const result = await useCase.execute({ businessUnitId, ...input });
  // ...
};
```

**Pros:**
- ✅ Seguridad: el cliente no puede fabricar `business_unit_id`.
- ✅ Autorización: el JWT es la fuente de verdad. No hay que hacer query adicional a BD.
- ✅ Escalable: soporta SUPERADMIN con múltiples unidades, ADMIN con una, WORKER con una.
- ✅ Estándar: es el patrón OAuth 2.0 (scopes / roles + recursos).
- ✅ Auditoría: la unidad está en el JWT que se guarda en logs, trazabilidad clara.

**Contras:**
- Requiere migración del endpoint de `IniciarSesion` (incluir la consulta de `user_business_units`).
- Requiere actualizar el plugin Fastify JWT para decodificar el claim.
- Token JWT es más grande (bytes adicionales por usuario).
- Si las asignaciones de unidad cambian (ej. un ADMIN se transfiere a otro punto), el JWT es inválido hasta el refresco.

### 2. Query a BD en middleware (sin JWT)

**Descripción:** En cada request, ejecutar:

```sql
SELECT business_unit_id FROM user_business_units WHERE user_id = $1;
```

Luego validar que el `business_unit_id` del body está en ese resultado.

**Pros:**
- ✅ El JWT sigue simple.
- ✅ Cambios de asignación de unidad son inmediatos (no requiere refresco).

**Contras:**
- ❌ Query adicional en cada request (overhead).
- ❌ Si la BD es slow, el endpoint es slow.
- ❌ Violación del principio Zero-Trust: el cliente sigue enviando `business_unit_id`, solo validamos después.
- ❌ Race condition: si alguien quita la asignación entre validación y ejecución, hay exploitación.

### 3. RLS en tabla `stock_movements` sin validación en aplicación

**Descripción:** Dejar que el cliente envíe `business_unit_id`, y confiar completamente en RLS:

```sql
CREATE POLICY "users_see_own_unit_stock"
ON stock_movements
FOR SELECT
USING (
  business_unit_id IN (
    SELECT business_unit_id FROM user_business_units WHERE user_id = auth.uid()
  )
);
```

**Pros:**
- ✅ Defensa en profundidad: incluso si un controlador es vulnerable, RLS protege.

**Contras:**
- ❌ No es Zero-Trust: el cliente sigue enviando un campo que no debería.
- ❌ Viaja en la red (información que el usuario no debería tener).
- ❌ Falso positivo de seguridad: parece seguro, pero la culpa está en RLS, no en arquitectura.
- ❌ Difícil de auditar: ¿por qué el cliente envía eso? Error o intento de exploit.

### 4. Usar el nombre de rol + BD de lectura de "unidad por defecto"

**Descripción:** Si el usuario es ADMIN/WORKER, leer su unidad de una tabla `user_preferences` o `users.primary_business_unit_id`.

**Pros:**
- ✅ Requerimientos simples para usuarios normales.

**Contras:**
- ❌ No escala: SUPERADMIN necesita especificar unidad de todas formas.
- ❌ Sigue siendo query a BD (opción 2 disfrazada).
- ❌ ¿Qué pasa si no hay unidad por defecto? Error ambiguo.

---

## Decisión

**Se modifica el JWT para incluir el claim `zahavi_business_units: string[]`.**

### Plan de implementación

#### 1. Actualizar endpoint `IniciarSesion` (Identity BC)

En `packages/application/src/identity/IniciarSesion.usecase.ts`:

```typescript
export class IniciarSesion {
  async execute(input: IniciarSesionInput): Promise<Result<JWTPayload, AuthError>> {
    const user = await this.userRepository.getByEmail(input.email);
    if (!user) return err(new InvalidCredentialsError());
    // ... validar password, 2FA ...

    // NUEVO: obtener unidades del usuario
    const businessUnits = await this.businessUnitRepository.getByUserId(user.id);
    const businessUnitIds = businessUnits.map(bu => bu.id.value);

    const payload: JWTPayload = {
      sub: user.id.value,
      sesion_id: newSessionId,
      zahavi_rol: user.role.value,
      zahavi_business_units: businessUnitIds,  // ← NUEVO
      iat: now,
      exp: now + 3600,
    };

    return ok(payload);
  }
}
```

#### 2. Actualizar tipos en Identity BC

En `packages/domain-identity/src/Session.ts`:

```typescript
export interface JWTPayload {
  sub: string;              // user ID
  sesion_id: string;        // session ID
  zahavi_rol: "SUPERADMIN" | "ADMIN" | "WORKER";
  zahavi_business_units: string[];  // ← NUEVO
  iat: number;
  exp: number;
}
```

#### 3. Actualizar plugin Fastify JWT

En `apps/api/src/plugins/jwt.ts`:

```typescript
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  decode: { complete: true },
});

fastify.decorate('user', null);

fastify.addHook('onRequest', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch (error) {
    reply.forbidden();
  }
});

// Ahora req.user: JWTPayload contiene zahavi_business_units
```

#### 4. Actualizar handlers de Inventory

En `apps/api/src/routes/inventory/movimientos.ts`:

```typescript
const PostMovimientoIngresoSchema = z.object({
  // Antes: businessUnitId: z.string().uuid(),
  // Ahora: SIN businessUnitId
  ingredienteId: z.string().uuid(),
  cantidad: z.number().positive(),
  // ... otros campos
});

export const postMovimientoIngreso = async (req: FastifyRequest, reply: FastifyReply) => {
  // Derivar businessUnitId del JWT
  const userRole = req.user.zahavi_rol;
  const allowedUnits = req.user.zahavi_business_units;

  let businessUnitId: string;
  if (userRole === "SUPERADMIN") {
    // SUPERADMIN especifica la unidad en query param, o usa la primera
    businessUnitId = req.query.businessUnitId || allowedUnits[0];
    if (!allowedUnits.includes(businessUnitId)) {
      return reply.forbidden("Unidad fuera de alcance");
    }
  } else {
    // ADMIN/WORKER usan su única unidad asignada
    businessUnitId = allowedUnits[0];
  }

  const input = PostMovimientoIngresoSchema.parse(req.body);
  const useCase = new RegistrarMovimientoIngreso(/* adapters */);
  const result = await useCase.execute({
    businessUnitId,
    ...input,
  });

  if (result.isErr()) {
    // Manejar error de dominio
    return reply.badRequest(result.error.message);
  }

  return reply.code(201).send(result.value);
};
```

#### 5. Actualizar schemas Zod

Remover `businessUnitId` del schema de input:

```typescript
// Antes
export const RegistrarMovimientoSchema = z.object({
  businessUnitId: z.string().uuid(),  // ← ELIMINAR
  ingredienteId: z.string().uuid(),
  cantidad: z.number(),
});

// Después
export const RegistrarMovimientoSchema = z.object({
  ingredienteId: z.string().uuid(),
  cantidad: z.number(),
});
```

#### 6. Tests

- Tests de `IniciarSesion`: verificar que el JWT incluye `zahavi_business_units`.
- Tests de handlers de Inventory: mockear `req.user` con `zahavi_business_units` y validar que sin él, retorna 403.
- Integration test: crear usuario, asignarle una unidad, login, verificar JWT, usar endpoint, verificar que funciona.

---

## Consecuencias

### Positivas

1. **Seguridad:** El cliente no puede enviar `business_unit_id` fabricado. Es derivado del JWT, que es firmado.

2. **Zero-Trust:** La aplicación no confía en el cliente; confía en el JWT. Cada layer (middleware, handler, caso de uso, RLS) valida independientemente.

3. **Autorización clara:** El JWT es la fuente de verdad. No hay queries adicionales en cada request.

4. **Auditoría:** El JWT con `zahavi_business_units` queda registrado en logs. Trazabilidad de quién accedió qué unidad cuándo.

5. **Preparado para WORKER:** Una vez el JWT tiene las unidades, los handlers de Inventory pueden soportar WORKER sin cambios (solo cambiar `isAuthorized(userRole)` en middleware).

6. **Estándar:** Es el patrón de OAuth 2.0 / OpenID Connect (scopes, claims). Fácil de entender.

### Negativas / Trade-offs

1. **Token más grande:** Cada JWT lleva un array de UUIDs. Para un usuario con 10 unidades, es ~400 bytes extra. Negligible en la mayoría de casos, pero si tienes 10k requests/seg, es 4MB/seg de bytes extra en headers.

   *Mitigación:* En la práctica, usuarios tienen 1-3 unidades max. Y Supabase comprime headers.

2. **Requiere refresco para cambios:** Si le asignas una nueva unidad a un usuario, su JWT antiguo no la incluye. Hay que refrescar.

   *Mitigación:* Es expected behavior de OAuth 2.0. Los refresh tokens (si se usan) pueden inclur la lógica de refresco automático.

3. **Migración de datos:** Crear la tabla `user_business_units` y migrar datos existentes.

   *Mitigación:* Migración SQL simple. Si hay usuarios sin unidades asignadas, `zahavi_business_units` es array vacío (requiere policy de "deny all").

4. **Complejidad de handlers:** El handler ahora tiene lógica de "derivar businessUnitId". Hay que documentarlo bien.

   *Mitigación:* Crear función helper `extractBusinessUnitId(req: FastifyRequest): string` que encapsula la lógica.

### Riesgos a monitorear

- **JWT expiración:** Si un usuario tiene sesión larga abierta y le cambian las unidades, no se enteran hasta que el JWT expira. Esto es expected, pero hay que documentar.
- **SUPERADMIN con muchas unidades:** Si hay unidades heterogéneas (ej. 100 puntos de venta), el JWT es grande. Considerar paginar en el future.
- **Cambios esquema de BD:** Si `user_business_units` tabla cambia, hay que actualizar `IniciarSesion`. Documentar.

---

## Referencias

- **OAuth 2.0 / OpenID Connect** — RFC 6749, 6750. Claims en JWT como autorización.
- **Zero-Trust Security** — CLAUDE.md §2.2. No confiar en cliente; derivar credenciales del servidor.
- **NIST SP 800-207** — Zero Trust Architecture. Every access request is fully authenticated and authorized.

### Documentación interna relacionada

- `packages/domain-identity/src/Session.ts` — Define `JWTPayload`.
- `packages/application/src/identity/IniciarSesion.usecase.ts` — Implementación del caso de uso.
- `apps/api/src/plugins/jwt.ts` — Plugin Fastify JWT.
- `apps/api/src/routes/inventory/` — Handlers que consumen el claim.
- `docs/domain-model/identity/` — Glossario, agregates de Identity.

### Cambios derivados (bloqueadores)

- ✅ Crear tabla `user_business_units(user_id, business_unit_id)` con FK e índices.
- ✅ Migración de datos: si hay usuarios sin asignación, crear una por defecto o marcar como "sin acceso".
- ✅ Actualizar tests de `IniciarSesion` para validar claim.
- ✅ Actualizar tests de handlers de Inventory.
- ✅ Documentar en OpenAPI que `businessUnitId` ya NO es parámetro de request (solo para SUPERADMIN como query param).

### Changesets inminentes

- ADR-0004: Manejo de eventos de cambio de unidad (cuando se asigna/desasigna usuario de unidad, ¿qué pasa con sesiones abiertas?).
- Runbook: "Cómo cambiar la asignación de unidad de un usuario".

---

## Aprobación

- ⏳ **Estado: Pendiente aprobación de Julian**
- Bloquea: Habilitación de rol WORKER en endpoints de Inventory, exposición a producción pública.
- Criterios de aprobación:
  - ✅ Decisión arquitectónica revisada.
  - ✅ Impacto de seguridad validado por `security-auditor`.
  - ✅ Plan de migración de datos revisado por `db-reviewer`.
  - ✅ Estimación de esfuerzo documentada.

**Estimación:** 2-3 días (1 día: schema + migración; 1 día: modificar endpoints; 0.5 días: tests; 0.5 días: documentación y validación).

**Riesgos de implementación:**
- Si la migración se ejecuta mal, usuarios quedan sin unidades (mitigación: script de rollback).
- Si handlers no validan `allowedUnits`, usuarios pueden ver stock de otras unidades (mitigación: tests exhaustivos).
