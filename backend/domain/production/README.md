# @zahavi/domain-production

Núcleo del bounded context **Production**. Gestiona el flujo productivo de la planta central: orden de producción, BOM (Bill of Materials), reserva y consumo de ingredientes, registro de merma, lote producido y despacho a puntos de venta.

## Lenguaje ubicuo

| Término | Definición |
|---|---|
| Orden de Producción (OdP) | Compromiso operativo de fabricar N unidades de una variante en la planta central |
| BOM (Bill of Materials) | Lista de ingredientes y cantidades requeridos por la OdP, derivada de la receta |
| Reserva de ingredientes | Apartado lógico de stock para una OdP, antes de su ejecución |
| Ejecución | Acto de transformar los ingredientes reservados en producto terminado |
| Merma | Pérdida inevitable de materia o producto durante la producción |
| Lote de producción | Identificador trazable de la tanda producida (código + fecha + cantidad) |
| Despacho | Envío del lote (o parte) desde planta central a un punto de venta |
| Balance diario | Resumen agregado de OdPs ejecutadas, mermas y despachos del día |

## Aggregates

| Aggregate Root | Responsabilidad | Estado |
|---|---|---|
| `OrdenDeProduccion` | Ciclo de vida productivo: planificación, reserva, ejecución, registro de mermas | `PLANIFICADA → RESERVADA → EN_EJECUCION → EJECUTADA → CANCELADA` |
| `Despacho` | Envío de unidades producidas a un punto de venta | `PREPARADO → EN_TRANSITO → ENTREGADO → CANCELADO` |

### Invariantes — `OrdenDeProduccion`

1. `cantidadAProducir > 0`.
2. La OdP siempre ocurre en una `businessUnitId` que representa la **planta central** (validado en caso de uso).
3. `bom.length >= 1` una vez calculado el BOM.
4. Identificadores de línea de BOM únicos.
5. `ingredientId` únicos dentro del BOM (un ingrediente aparece a lo sumo una vez).
6. Transiciones de estado válidas:
   - `PLANIFICADA → RESERVADA → EN_EJECUCION → EJECUTADA`
   - `PLANIFICADA | RESERVADA → CANCELADA`
   - Ningún estado vuelve atrás. `EJECUTADA` y `CANCELADA` son terminales.
7. Solo se pueden registrar mermas mientras la OdP está `EN_EJECUCION`.
8. La cantidad de merma de un ingrediente no puede exceder la cantidad consumida real reportada para él.
9. Una vez `EJECUTADA`, el lote producido es inmutable y debe llevar `cantidadProducida > 0` y `cantidadProducida <= cantidadAProducir`.

### Invariantes — `Despacho`

1. `cantidadDespachada > 0`.
2. `cantidadDespachada <= lote.cantidadProducida`.
3. `puntoDeVentaDestinoId != plantaCentralId` (no despacho a sí misma).
4. Transiciones de estado: `PREPARADO → EN_TRANSITO → ENTREGADO`; `PREPARADO | EN_TRANSITO → CANCELADO`.

## Domain Events

- `OrdenDeProduccionCreada`
- `BOMCalculadoParaOrden`
- `IngredientesReservadosParaOrden`
- `OrdenDeProduccionIniciada`
- `MermaDeProduccionRegistrada`
- `OrdenDeProduccionEjecutada`
- `OrdenDeProduccionCancelada`
- `DespachoPreparado`
- `DespachoEnviado`
- `DespachoEntregado`
- `DespachoCancelado`

## Interacciones con otros BC (vía ACL / Eventos)

- **Catalog (entrada)**: la receta y sus líneas se reciben como parámetros del caso de uso al calcular el BOM. Production NO importa nada de Catalog: usa IDs opacos (`RecipeIdRef`, `IngredientIdRef`, `ProductVariantIdRef`).
- **Inventory (salida por eventos)**: tras `OrdenDeProduccionEjecutada`, el caso de uso de aplicación dispara los movimientos de stock en Inventory (consumo + merma). La consistencia es eventual.
- **Sales (salida por eventos)**: tras `DespachoEntregado`, el caso de uso aplicación incrementa la disponibilidad en el punto de venta correspondiente.

## Cómo correr tests

```sh
pnpm --filter @zahavi/domain-production test
```

## Dependencias

- `@zahavi/domain-shared-kernel` (única dependencia).
- Sin dependencias externas, sin SDKs, sin Supabase.
