# @zahavi/domain-sales

Dominio puro del bounded context **Sales** (Ventas) de Zahavi POS.

## Propósito

Modela el ciclo completo de atención al cliente en los puntos de venta:
apertura de mesa → toma de comanda → envío a cocina → cobro → emisión de factura interna.

## Aggregates

| Aggregate | Estados | Descripción |
|---|---|---|
| `Mesa` | LIBRE / OCUPADA / RESERVADA / EN_COBRO | Mesa física o ad-hoc. Tiene como máximo una comanda activa. |
| `Comanda` | ABIERTA / ENVIADA / EN_PREPARACION / LISTA / CERRADA / CANCELADA | Pedido de un grupo de clientes. Contiene `LineaDeComanda`. |
| `Cobro` | PENDIENTE / PROCESADO / FALLIDO / ANULADO | Registro del pago. Soporta múltiples métodos (`PagoDetalle`). |
| `Factura` | EMITIDA / ANULADA | Recibo interno. Snapshot inmutable de líneas y totales. |

## Invariantes principales

- Mesa OCUPADA tiene exactamente una comanda activa.
- No se pueden agregar líneas a una comanda que no está ABIERTA.
- El total cobrado debe cubrir el total de la comanda para procesar el cobro.
- IVA calculado por línea (0% o 19% según producto).
- Moneda: COP, enteros sin decimales.

## ACL externa requerida

- `IConsultorDeProductoParaVentas` (puerto en `@zahavi/ports`) — resuelve nombre,
  precio y tasa de IVA de una variante antes de agregarla a la comanda.
  Evita importar el aggregate `Producto` del BC Catalog.

## Correr tests

```bash
pnpm --filter @zahavi/domain-sales test
```

## Dependencias

- `@zahavi/domain-shared-kernel` (FechaHora, DomainError, Result)
