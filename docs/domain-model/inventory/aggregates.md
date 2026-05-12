# Mapa de Aggregates — Bounded Context: Inventory

> Modelo de dominio del BC Inventory: ingredientes, niveles de stock por unidad
> de negocio, proveedores y alertas. El libro de movimientos (`StockMovement`) se
> modela como secuencia de Domain Events append-only; `StockItem` es su
> proyección materializada.

---

## Resumen

El BC Inventory contiene cuatro aggregates:

1. **Ingredient (Ingrediente)** — dato maestro del insumo: unidad nativa, costo
   unitario actual, umbral de alerta, estado.
2. **StockItem** — nivel de stock de un ingrediente en una unidad de negocio,
   con costo promedio ponderado y `version` para concurrencia optimista.
3. **Supplier (Proveedor)** — datos maestros del proveedor.
4. **StockAlert (Alerta de stock)** — hecho: el stock cayó bajo el umbral.

La consistencia entre aggregates es **eventual**, coordinada por casos de uso y
Domain Events. Un caso de uso típico (registrar compra) carga el `StockItem`,
aplica el ingreso, y como reacción al evento puede abrir/cerrar un `StockAlert`.

`IngredientId` es la referencia canónica; el BC Catalog mantiene una copia ACL
opaca del mismo valor (UUID) y nunca importa estos aggregates.

---

## Diagrama textual

```
┌───────────────────────────┐        ┌────────────────────────────────────┐
│ Ingredient (aggregate)    │        │ StockItem (aggregate)              │
│  - id: IngredientId       │        │  - id: StockItemId                 │
│  - nombre                 │        │  - ingredientId: IngredientId  ────┼──► ref
│  - unidadNativa           │        │  - businessUnitId: BusinessUnitId  │
│  - costoUnitarioActual    │        │  - cantidadDisponible (>= 0)       │
│  - umbralDeAlerta (>= 0)  │        │  - unidadNativa                    │
│  - estado: activo|inactivo│        │  - costoPromedioUnitario (Money)   │
└───────────────────────────┘        │  - version                         │
                                     │  - actualizadoEn                   │
┌───────────────────────────┐        └────────────────┬───────────────────┘
│ Supplier (aggregate)      │                         │ verificarAlerta(umbral)
│  - id: SupplierId         │                         ▼
│  - nombre                 │        ┌────────────────────────────────────┐
│  - contacto               │        │ StockAlert (aggregate)             │
│  - notas                  │        │  - id: StockAlertId                │
│  - estado: activo|inactivo│        │  - ingredientId / businessUnitId   │
└───────────────────────────┘        │  - stockAlMomento / umbralAlMomento│
                                     │  - unidad                          │
                                     │  - estado: ABIERTA|CERRADA|ANULADA │
                                     │  - creadaEn / cierreEn?            │
                                     └────────────────────────────────────┘
```

---

## Aggregate: Ingredient

- **Aggregate Root:** `Ingredient`. Sin entidades hijas.
- **Value Objects:** `IngredientId`, `UnidadNativa`, `Money` (costo).
- **Invariantes:**
  1. `costoUnitarioActual >= 0` (cero válido: insumo propio sin costo registrado).
  2. `umbralDeAlerta >= 0` (cero deshabilita la alerta).
  3. `estado` solo transita `activo ↔ inactivo`.
  4. `unidadNativa` es inmutable tras la creación.
- **Comandos:** `crear`, `cambiarCosto`, `cambiarUmbral`, `desactivar`, `reactivar`.
- **Eventos:** `IngredienteCreado`, `CostoDeIngredienteCambiado`,
  `UmbralDeIngredienteCambiado`, `IngredienteDesactivado`, `IngredienteReactivado`.

## Aggregate: StockItem

- **Aggregate Root:** `StockItem`. Sin entidades hijas (el detalle de movimientos
  vive como eventos, no como colección interna del aggregate).
- **Value Objects:** `StockItemId`, `IngredientId`, `BusinessUnitId`,
  `StockMovementId`, `SupplierId`, `StockAlertId`, `UnidadNativa`, `Money`.
- **Invariantes:**
  1. `cantidadDisponible >= 0` siempre. Toda salida que la dejaría negativa se
     rechaza con `StockNegativoError`.
  2. `costoPromedioUnitario >= 0` (garantizado por el tipo `Money`).
  3. Cada mutación incrementa `version` exactamente en 1. `verificarAlerta` no
     muta el stock, por lo que no cambia la `version`.
  4. El costo promedio se recalcula solo en ingresos; las salidas no lo afectan.
- **Comandos:**
  - `crear` → arranca en cantidad 0, costo 0, version 1.
  - `registrarIngreso(cantidad, costoUnitario, movimientoId, supplierId, ahora, eventoId)`.
  - `registrarSalida(cantidad, tipoMovimiento, referencia, movimientoId, ahora, eventoId)`
    con `tipoMovimiento ∈ {PRODUCTION_OUT, WASTE}`.
  - `ajustar(cantidadNueva, motivo, movimientoId, ahora, eventoId)` — `motivo` no vacío.
  - `verificarAlerta(umbralDeAlerta, alertaId, ahora, eventoId)` → `{ stockItem, alertaEmitida }`.
- **Eventos:** `StockItemCreado`, `CompraRegistrada`, `SalidaDeProduccionRegistrada`,
  `MermaRegistrada`, `AjusteRegistrado`, `AlertaDeStockAbierta`.

## Aggregate: Supplier

- **Aggregate Root:** `Supplier`. Sin entidades hijas.
- **Value Objects:** `SupplierId`.
- **Invariantes:**
  1. `estado` solo transita `activo → inactivo` (no se reactiva).
- **Comandos:** `crear`, `desactivar`, `actualizar`.
- **Eventos:** `ProveedorCreado`, `ProveedorActualizado`, `ProveedorDesactivado`.

## Aggregate: StockAlert

- **Aggregate Root:** `StockAlert`. Sin entidades hijas.
- **Value Objects:** `StockAlertId`, `IngredientId`, `BusinessUnitId`, `UnidadNativa`.
- **Invariantes:**
  1. Transiciones válidas: `ABIERTA → CERRADA`, `ABIERTA → ANULADA`. No hay
     reapertura.
  2. `stockAlMomento` y `umbralAlMomento` son fotos del instante de apertura
     (inmutables).
  3. Unicidad de alerta `ABIERTA` por `(ingredientId, businessUnitId)` — la
     asegura el caso de uso consultando antes de abrir (no es invariante interno
     del aggregate porque cruza identidades).
- **Comandos:** `abrir`, `cerrar`, `anular`.
- **Eventos:** `AlertaDeStockAbierta`, `AlertaDeStockCerrada`, `AlertaDeStockAnulada`.

---

## Decisiones de modelado

- **`StockMovement` como evento, no como entidad hija de `StockItem`.** El libro
  de movimientos es append-only y potencialmente grande; meterlo dentro del
  aggregate lo volvería pesado. `StockItem` mantiene solo el saldo y el costo
  promedio (la proyección), y emite un Domain Event por cada movimiento.
- **`version` en `StockItem`.** El stock se toca desde varios canales (compra en
  back-office, salida de producción, ajuste). Concurrencia optimista evita
  perder actualizaciones; el adaptador de persistencia hace el check.
- **Costo promedio redondeado a COP entero.** `Money` no admite decimales. Se
  acepta una mínima deriva de redondeo en el promedio; es lo que Zahavi usa hoy
  en su contabilidad manual.
- **`verificarAlerta` recibe `umbralDeAlerta` y `alertaId` como argumentos.** El
  umbral vive en `Ingredient` (otro aggregate) y el `alertaId` lo genera la capa
  de aplicación; el dominio no genera ids ni cruza aggregates por referencia.
- **`Supplier` sin historial de compras.** El historial se reconstruye del libro
  de movimientos filtrando por `supplierId`. Mantener el aggregate pequeño.

---

## Preguntas abiertas para Julian

1. **¿Se rastrea inventario de producto terminado en vitrina** (croissants,
   panes ya horneados en el punto de venta), o el inventario es solo de
   ingredientes? Hoy el modelo asume solo ingredientes.
2. **¿Una compra puede tener costo unitario en otra moneda o solo COP?** Hoy todo
   es COP entero.
3. **¿Mermas tienen un porcentaje "aceptable" por ingrediente** que dispare una
   alerta distinta si se supera? Hoy toda merma se registra igual sin umbral.
4. **¿El ajuste manual puede ejecutarlo un WORKER o solo ADMIN/SUPERADMIN?** El
   dominio no distingue rol; la guarda iría en el caso de uso.
5. **¿Hay que soportar transferencias de stock entre puntos** (planta central →
   punto de venta) como un movimiento propio, o eso ya lo cubre el BC Production
   con sus despachos?
