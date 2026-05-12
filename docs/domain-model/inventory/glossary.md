# Glosario Ubicuo — Bounded Context: Inventory

> Lenguaje del negocio para el inventario de Zahavi: ingredientes, stock por
> punto, movimientos, proveedores y alertas. Los nombres aquí definidos son los
> que aparecen en el código (`packages/domain/inventory/`).

---

## Términos

### Ingrediente (`Ingredient`)
Insumo comprable y consumible: harina, levadura, leche, cajas, bolsas, vasos.
Los empaques se modelan como ingredientes porque se compran y se consumen igual.
Tiene una **unidad nativa** fija (no cambia) y un **costo unitario actual** (COP)
y un **umbral de alerta**. Es el dato canónico; el BC Catalog guarda solo su id.
- Sinónimos descartados: "insumo" (ambiguo con producto terminado), "materia prima".

### Unidad nativa (`UnidadNativa`)
Unidad de medida en la que se contabiliza el stock de un ingrediente: `kg`, `g`,
`L`, `mL`, `unidad`. Las conversiones (p. ej. receta en gramos, compra en kilos)
las resuelve un adaptador ACL antes de tocar el dominio. El stock siempre se
guarda en unidad nativa.

### Stock / StockItem (`StockItem`)
La cantidad disponible de **un ingrediente concreto en una unidad de negocio
concreta** (planta central o un punto de venta), más su **costo promedio
ponderado**. Es la proyección materializada del libro de movimientos. Nunca es
negativo. Tiene una `version` para detección optimista de concurrencia.
- Sinónimos descartados: "existencia", "saldo de inventario".

### Unidad de negocio (`BusinessUnitId`)
Planta central o punto de venta. El stock siempre está particionado por unidad de
negocio: el mismo ingrediente tiene un `StockItem` por cada una.

### Movimiento de stock (`StockMovement`, `TipoMovimiento`)
Hecho append-only que altera el stock. Nunca se modifica ni se borra; las
correcciones se hacen con un movimiento nuevo. Tipos:
- **Compra / entrada** (`PURCHASE_IN`): llega mercancía de un proveedor. Sube el
  stock y recalcula el costo promedio ponderado.
- **Salida de producción** (`PRODUCTION_OUT`): la planta consume el ingrediente
  para una orden de producción. Baja el stock.
- **Merma** (`WASTE`): producto vencido, dañado o derramado. Baja el stock y queda
  auditado con su motivo.
- **Ajuste** (`ADJUSTMENT`): corrección manual tras un conteo físico. Fuerza el
  stock a un valor; **requiere justificación**.

### Costo promedio ponderado (`costoPromedioUnitario`)
Costo por unidad nativa que resulta de promediar las compras según cantidad:
`nuevoCosto = (stockActual·costoActual + cantidad·costoCompra) / (stockActual + cantidad)`.
Se redondea a peso colombiano entero (COP no admite decimales).
- Sinónimo descartado: "costo último" (Zahavi quiere promedio, no FIFO/LIFO).

### Compra (`CompraRegistrada`)
Registro de una entrada de stock proveniente de un proveedor. Lleva cantidad,
costo unitario pactado, unidad y el proveedor. Una compra puede agrupar varias
líneas (varios ingredientes), pero cada línea es un movimiento independiente.

### Merma (`MermaRegistrada`)
Salida de stock por pérdida (vencimiento, daño, derrame). Siempre auditable con
motivo. Distinta de la salida de producción, que es consumo legítimo.

### Ajuste (`AjusteRegistrado`)
Corrección manual del stock tras conteo físico o detección de descuadre. Lleva
cantidad anterior, cantidad nueva y **motivo obligatorio**.

### Proveedor (`Supplier`)
Quien vende ingredientes a Zahavi. Datos maestros: nombre, contacto (teléfono o
email), notas, estado. No guarda historial de compras (eso vive en el libro de
movimientos). No se "reactiva": si vuelve a operar se crea uno nuevo.
- Sinónimo descartado: "distribuidor".

### Umbral de alerta (`umbralDeAlerta`)
Cantidad mínima de un ingrediente por debajo de la cual el sistema avisa. Vive en
el `Ingredient`. Un umbral de **cero deshabilita** la alerta.

### Alerta de stock (`StockAlert`, `EstadoDeAlerta`)
Hecho de negocio: "el stock de tal ingrediente en tal punto cayó por debajo del
umbral en tal momento". Estados:
- **Abierta**: el stock sigue bajo, requiere reposición.
- **Cerrada**: el stock se repuso por encima del umbral.
- **Anulada**: el ingrediente fue desactivado/eliminado mientras había alerta.
Solo puede haber una alerta abierta por (ingrediente, unidad de negocio). No se
reabre: si vuelve a caer el stock, se abre una alerta nueva.
- Sinónimo descartado: "notificación de bajo stock".

### Vitrina / crudo / en proceso
Estados físicos del producto en el punto de venta usados coloquialmente por los
empleados. En este modelo de dominio NO se rastrean como estados de inventario:
el inventario es de ingredientes, no de producto terminado en vitrina. (Pendiente
de confirmar con Julian si debe modelarse — ver preguntas abiertas.)
