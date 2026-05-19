# @zahavi/ports

Interfaces (puertos) que el dominio y los casos de uso esperan de la infraestructura. Sin implementaciones concretas.

## Contratos públicos

### Identity

| Puerto | Descripción |
|---|---|
| `RepositorioDeUsuarios` | CRUD de `Usuario` |
| `RepositorioDeSesiones` | CRUD y conteo de `Sesion` |
| `RepositorioDeDispositivosAutorizados` | CRUD de `DispositivoAutorizado` |
| `RepositorioDeUnidadesDeNegocio` | Relación usuario-unidad de negocio |
| `VerificadorDeContrasena` | Hash + verificación bcrypt |
| `VerificadorDePin` | Hash + verificación bcrypt de PIN |
| `VerificadorDeTotp` | TOTP: generar secreto, URL de enrolamiento, verificar código |
| `Reloj` | Abstracción del tiempo (`ahora(): FechaHora`) |
| `GeneradorDeIds` | UUID para cada aggregate |
| `PoliticaDeSesionPorRol` | Obtener `PoliticaDeSesion` según `Rol` |
| `PublicadorDeDomainEvents` | Publicar eventos del dominio |
| `NotificadorDeIdentidad` | Notificaciones de seguridad (email, push) |

### Catalog / Inventory

Ver `src/catalog/` y `src/inventory/` respectivamente.

### Errores de infraestructura

`RepositorioNoDisponibleError`, `ConflictoDeVersionError`.

## Cómo correr tests

```sh
pnpm --filter @zahavi/ports test
```

## Dependencias

- `@zahavi/domain-identity`, `@zahavi/domain-catalog`, `@zahavi/domain-inventory`
