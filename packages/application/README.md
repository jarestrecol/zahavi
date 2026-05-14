# @zahavi/application

Casos de uso de la aplicación organizados por bounded context. Orquestan el dominio usando los puertos definidos en `@zahavi/ports`.

## Identity

| Caso de uso | Descripción |
|---|---|
| `RegistrarUsuario` | Crea un usuario con rol y tipo de credencial. Solo SUPERADMIN puede crear ADMIN/SUPERADMIN. |
| `AsignarRol` | Cambia el rol de un usuario existente con las invariantes de jerarquía. |
| `IniciarSesion` | Autenticación navegador (contraseña + TOTP opcional/obligatorio) o tablet (PIN + dispositivo). Incluye `bu_id` en la respuesta para el JWT. |
| `IniciarEnrolamientoTotp` | Genera secreto TOTP y URL de enrolamiento para el authenticator. |
| `ConfirmarTotp` | Verifica el primer código TOTP y marca el enrolamiento como completado. |
| `RevocarSesion` | ADMIN/SUPERADMIN revoca la sesión de otro usuario. |
| `CerrarSesion` | El propietario cierra su propia sesión. |
| `CambiarContextoBusinessUnit` | ADMIN/SUPERADMIN cambia el contexto de unidad de negocio activo. WORKER siempre bloqueado. |

## Catalog (8 casos de uso)

`CrearProducto`, `ActualizarPrecio`, `DefinirReceta`, `PublicarProducto`, `ArchivarProducto`, `CrearCategoria`, `CalcularEscandallo`, `CrearCombo`.

## Inventory (9 casos de uso)

`CrearIngrediente`, `RegistrarCompra`, `RegistrarMerma`, `TransferirStock`, `AjustarStock`, `ListarStockActual`, `ConfigurarAlertaIngrediente`, `ListarHistoricoMovimientos`, `CalcularValorInventario`.

## Cómo correr tests

```sh
pnpm --filter @zahavi/application test
```

Cobertura actual: >326 tests, todos verdes.

## Dependencias

- `@zahavi/domain-identity`, `@zahavi/domain-catalog`, `@zahavi/domain-inventory`
- `@zahavi/ports` (interfaces)
