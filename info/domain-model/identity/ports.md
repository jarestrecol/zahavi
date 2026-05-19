# Puertos (Interfaces) — Bounded Context: Identity

> Los puertos viven en `packages/ports/identity/` y definen los contratos que
> el dominio espera de la infraestructura. **Las implementaciones (Supabase,
> SQLite offline, etc.) viven en `packages/adapters/`** y nunca se mencionan
> aquí. Este documento describe los puertos en prosa; el código TypeScript de
> los puertos se generará en una fase posterior.

---

## Repositorios

### `RepositorioDeUsuarios`

Persistencia y recuperación del aggregate `Usuario`.

Operaciones:

- `obtenerPorId(id: UsuarioId): Promise<Usuario | null>`
- `obtenerPorEmail(email: Email): Promise<Usuario | null>`
- `existeEmail(email: Email): Promise<boolean>`
- `guardar(usuario: Usuario): Promise<void>` — upsert atómico.
- `contarSuperadminsActivos(): Promise<number>` — soporta la invariante del
  último SUPERADMIN.
- `listarSuperadminsActivos(): Promise<UsuarioId[]>` — para verificar que el
  candidato a degradar/deshabilitar no es el único.
- `listar(filtro: { rol?: Rol, estado?: EstadoDeUsuario }): Promise<Usuario[]>`

Errores: `RepositorioNoDisponibleError`, `ConflictoDeVersionError`.

---

### `RepositorioDeSesiones`

Persistencia y recuperación del aggregate `Sesion`.

Operaciones:

- `obtenerPorId(id: SesionId): Promise<Sesion | null>`
- `guardar(sesion: Sesion): Promise<void>` — upsert atómico.
- `listarActivasDeUsuario(usuarioId: UsuarioId): Promise<Sesion[]>` — soporta
  la invariante de límite de sesiones simultáneas.
- `contarActivasDeUsuario(usuarioId: UsuarioId): Promise<number>`
- `listarActivasDeDispositivo(dispositivoId: DispositivoId): Promise<Sesion[]>`
  — soporta la cascada de revocación al revocar un dispositivo.
- `listarPotencialmenteExpiradas(ahora: FechaHora, limite: number): Promise<Sesion[]>`
  — soporta job/poll que invoca `expirarSiCorresponde` periódicamente.

Errores: `RepositorioNoDisponibleError`, `ConflictoDeVersionError`.

---

### `RepositorioDeDispositivosAutorizados`

Persistencia y recuperación del aggregate `DispositivoAutorizado`.

Operaciones:

- `obtenerPorId(id: DispositivoId): Promise<DispositivoAutorizado | null>`
- `guardar(dispositivo: DispositivoAutorizado): Promise<void>`
- `existeNombre(nombre: string): Promise<boolean>` — soporta unicidad de
  nombre.
- `listarActivos(): Promise<DispositivoAutorizado[]>`
- `estaActivo(id: DispositivoId): Promise<boolean>` — atajo para el caso de
  uso `AbrirSesion`.

Errores: `RepositorioNoDisponibleError`, `ConflictoDeVersionError`.

---

## Verificadores de credenciales

### `VerificadorDeContrasena`

Verifica que un texto plano corresponde a un `HashDeContrasena`. Aplica a
ADMIN y SUPERADMIN.

Operaciones:

- `verificar(plano: string, hash: HashDeContrasena): Promise<boolean>`
- `hashear(plano: string): Promise<HashDeContrasena>` — usado al cambiar
  contraseña.
- `validarPolitica(plano: string): Result<void, ContrasenaDebilError>` —
  política de complejidad.

---

### `VerificadorDePin`

Verifica que un PIN de 6 dígitos corresponde a un `HashDePin`. Aplica a
WORKER. **Tipo y operaciones explícitamente separadas de
`VerificadorDeContrasena`** para impedir cruces accidentales.

Operaciones:

- `verificar(plano: string, hash: HashDePin): Promise<boolean>`
- `hashear(plano: string): Promise<HashDePin>`
- `validarFormato(plano: string): Result<void, PinInvalidoError>` — exige
  exactamente 6 dígitos numéricos.

---

### `VerificadorDeTotp`

Verifica códigos TOTP contra un secreto. Aplica a ADMIN y SUPERADMIN.

Operaciones:

- `verificar(codigo: CodigoTotp, secreto: SecretoTotp, ahora: FechaHora): Promise<boolean>`
- `generarSecreto(): Promise<SecretoTotp>`
- `urlDeEnrolamiento(secreto: SecretoTotp, email: Email): string`

---

## Política de sesión

### `PoliticaDeSesionPorRol`

Resuelve la política aplicable según el rol. Es un puerto y no una constante
para permitir que el SUPERADMIN ajuste valores en el futuro sin recompilar
dominio.

Operaciones:

- `obtener(rol: Rol): PoliticaPorRol`

Donde `PoliticaPorRol` es:

```
{
  umbralBloqueo: Duracion,        // solo efectivo si contextoDispositivo = compartido
  umbralCierre: Duracion,         // cierre real por inactividad sostenida
  topeAbsoluto: Duracion,         // límite máximo desde iniciadaEn
  limiteSimultaneo: LimiteMaximoDeSesiones,
  requiereDispositivoAutorizado: boolean
}
```

Valores confirmados por Julian:

| Rol | umbralBloqueo | umbralCierre | topeAbsoluto | limiteSimultaneo | requiereDispositivoAutorizado |
|---|---|---|---|---|---|
| `SUPERADMIN` | 5 min | 30 min | 4 h | 3 | `false` |
| `ADMIN` | 5 min | 1 h | 8 h | 3 | `false` |
| `WORKER` | 5 min | 30 min | 12 h | 1 | `true` |

> `umbralBloqueo` se ignora cuando `contextoDispositivo = personal`.

---

## Reloj y aleatoriedad (puertos transversales)

### `Reloj`

Provee `ahora(): FechaHora`. Permite tests determinísticos. El dominio nunca
llama a `Date.now()` directamente.

### `GeneradorDeIds`

Provee identificadores opacos para `UsuarioId`, `SesionId`, `DispositivoId`.

Operaciones:

- `generarUsuarioId(): UsuarioId`
- `generarSesionId(): SesionId`
- `generarDispositivoId(): DispositivoId`

---

## Publicación de eventos

### `PublicadorDeDomainEvents`

Permite a los casos de uso emitir Domain Events tras persistir cambios.

Operaciones:

- `publicar(eventos: ReadonlyArray<DomainEvent>): Promise<void>`

Garantías esperadas de la implementación:

- **Outbox pattern** (entrega al menos una vez tras commit).
- Idempotencia por `eventoId`.

---

## Notificaciones (puerto saliente)

### `NotificadorDeIdentidad`

Canal para alertas operativas relacionadas con identidad.

Operaciones:

- `alertarUltimoSuperadmin(usuarioId: UsuarioId, ahora: FechaHora): Promise<void>`
- `notificarSesionRevocada(sesionId: SesionId, usuarioId: UsuarioId, motivo: MotivoDeRevocacionDeSesion): Promise<void>` *(opcional)*

Las implementaciones concretas (email, push, panel admin) viven en adapters.

---

## Resumen de puertos por caso de uso

| Caso de uso | Puertos requeridos |
|---|---|
| `CrearUsuario` | `RepositorioDeUsuarios`, `VerificadorDeContrasena` o `VerificadorDePin`, `VerificadorDeTotp` (si rol no es WORKER), `Reloj`, `GeneradorDeIds`, `PublicadorDeDomainEvents` |
| `AbrirSesion` (WORKER) | `RepositorioDeUsuarios`, `RepositorioDeDispositivosAutorizados`, `RepositorioDeSesiones`, `VerificadorDePin`, `PoliticaDeSesionPorRol`, `Reloj`, `GeneradorDeIds`, `PublicadorDeDomainEvents` |
| `AbrirSesion` (ADMIN/SUPERADMIN) | `RepositorioDeUsuarios`, `RepositorioDeSesiones`, `VerificadorDeContrasena`, `VerificadorDeTotp`, `PoliticaDeSesionPorRol`, `Reloj`, `GeneradorDeIds`, `PublicadorDeDomainEvents` |
| `RegistrarActividadDeSesion` | `RepositorioDeSesiones`, `Reloj`, `PublicadorDeDomainEvents` |
| `BloquearPantalla` / `DesbloquearPantalla` | `RepositorioDeSesiones`, `VerificadorDePin` o `VerificadorDeContrasena`+`VerificadorDeTotp`, `Reloj`, `PublicadorDeDomainEvents` |
| `CerrarSesion` | `RepositorioDeSesiones`, `Reloj`, `PublicadorDeDomainEvents` |
| `RevocarSesion` (administrativa) | `RepositorioDeUsuarios` (autorización del solicitante), `RepositorioDeSesiones`, `Reloj`, `PublicadorDeDomainEvents` |
| `ExpirarSesionesVencidas` (job) | `RepositorioDeSesiones`, `Reloj`, `PublicadorDeDomainEvents` |
| `CambiarRolDeUsuario` | `RepositorioDeUsuarios` (incluye `contarSuperadminsActivos`), `Reloj`, `PublicadorDeDomainEvents`, `NotificadorDeIdentidad` (si queda 1 SUPERADMIN) |
| `DeshabilitarUsuario` | `RepositorioDeUsuarios` (incluye `contarSuperadminsActivos`), `RepositorioDeSesiones` (cascada), `Reloj`, `PublicadorDeDomainEvents`, `NotificadorDeIdentidad` |
| `AutorizarDispositivo` | `RepositorioDeUsuarios` (autorización), `RepositorioDeDispositivosAutorizados`, `Reloj`, `GeneradorDeIds`, `PublicadorDeDomainEvents` |
| `RevocarDispositivo` | `RepositorioDeUsuarios` (autorización), `RepositorioDeDispositivosAutorizados`, `RepositorioDeSesiones` (cascada), `Reloj`, `PublicadorDeDomainEvents` |
| `ReautorizarDispositivo` | `RepositorioDeUsuarios` (autorización), `RepositorioDeDispositivosAutorizados`, `Reloj`, `PublicadorDeDomainEvents` |

---

## Notas finales

- Todos los puertos devuelven `Result<T, DomainError>` o `Promise<...>` con
  errores tipados. Nunca lanzan strings.
- Los puertos no exponen tipos de Supabase, Postgres, ni de ningún SDK. Solo
  tipos de dominio.
- Cuando un caso de uso necesite verificar autorización del solicitante
  (p.ej. "solo ADMIN/SUPERADMIN puede autorizar dispositivos"), recibe el
  `UsuarioId` del solicitante y consulta `RepositorioDeUsuarios`. La
  autorización de aplicación NO se baja al aggregate, pero la regla queda
  documentada en la invariante correspondiente.
