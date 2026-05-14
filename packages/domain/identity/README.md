# @zahavi/domain-identity

Núcleo del bounded context Identity. Contiene aggregates, value objects, domain events y errores de dominio. No importa ninguna dependencia externa.

## Aggregates

| Aggregate | Responsabilidad |
|---|---|
| `Usuario` | Identidad, credenciales (navegador/tablet), rol, estado activo/deshabilitado |
| `Sesion` | TTL deslizante + tope absoluto, estado activo/cerrado/bloqueado |
| `DispositivoAutorizado` | Dispositivos de punto de venta habilitados/revocados |

## Invariantes clave

- SUPERADMIN siempre requiere TOTP verificado para iniciar sesión.
- El último SUPERADMIN activo no puede ser degradado ni deshabilitado.
- El tipo de credencial debe ser coherente con el rol (WORKER → tablet, ADMIN/SUPERADMIN → navegador).
- Una sesión expirada o cerrada no puede registrar más actividad.

## Value Objects

`UsuarioId`, `SesionId`, `DispositivoId`, `Email`, `NombreCompleto`, `HashDeContrasena`, `HashDePin`, `SecretoTotp`, `CodigoTotp`, `PoliticaDeSesion`, `FechaHora`.

## Domain Events

`SesionAbierta`, `SesionCerrada`, `SesionRevocada`, `UsuarioRegistrado`, `RolAsignado`, `TotpIniciado`, `TotpConfirmado`, `DispositivoAutorizado`, `DispositivoRevocado`.

## Errores de dominio

Ver `src/errors/index.ts`. Todos extienden `DomainError` con un `code` tipado.

## Cómo correr tests

```sh
pnpm --filter @zahavi/domain-identity test
```

## Dependencias

- `@zahavi/domain-shared-kernel` (tipos transversales como `Result<T, E>`)
- Sin dependencias externas — pureza garantizada por el linter.
