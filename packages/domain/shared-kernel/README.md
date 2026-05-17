# @zahavi/domain-shared-kernel

Núcleo compartido del dominio. Contiene los bloques de construcción que usan todos los bounded contexts: tipo `Result`, clase base `DomainError`, Value Objects transversales (`Money`, `FechaHora`) y el contrato `DomainEvent`.

## Contratos públicos

| Exportación | Tipo | Descripción |
|---|---|---|
| `Result<T, E>` | Tipo | Unión discriminada `{ ok: true, value: T } \| { ok: false, error: E }`. Reemplaza excepciones en capas de aplicación. |
| `ok(value)` | Función | Construye `Result` exitoso. |
| `err(error)` | Función | Construye `Result` fallido. |
| `DomainError` | Clase abstracta | Base de todos los errores de dominio. Requiere `code: string`. |
| `Money` | Value Object | Importe monetario en COP (entero, sin decimales). Inmutable. |
| `FechaHora` | Value Object | Fecha/hora con zona horaria America/Bogota. Inmutable. |
| `DomainEvent` | Interfaz | Contrato base de todos los domain events. |

## Reglas de uso

- Este package **no puede importar** nada fuera de `packages/domain/`. Cero dependencias externas.
- Todos los bounded contexts dependen de este package, nunca al revés.
- `Money` representa COP: entero positivo. Usar `Money.fromCOP(valor)` para construir.

## Tests

```bash
pnpm --filter @zahavi/domain-shared-kernel test
```
