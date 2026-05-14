# @zahavi/domain-inventory

Núcleo del bounded context Inventory. Gestiona ingredientes, stock por unidad de negocio, movimientos, proveedores, órdenes de compra y alertas.

## Aggregates

| Aggregate | Responsabilidad |
|---|---|
| `Ingredient` | Ingrediente con unidad de medida, stock mínimo y costo unitario |
| `StockItem` | Stock actual de un ingrediente en una unidad de negocio |
| `StockMovement` | Movimiento de stock: compra, producción, merma, transferencia, ajuste, venta |
| `Supplier` | Proveedor con contacto y términos |
| `PurchaseOrder` | Orden de compra a un proveedor |
| `Alert` | Alerta de stock bajo o vencimiento |

## Tipos de movimiento

`PURCHASE_IN`, `PRODUCTION_OUT`, `WASTE`, `TRANSFER_BETWEEN_UNITS`, `ADJUSTMENT`, `SALE_OUT`.

## Cómo correr tests

```sh
pnpm --filter @zahavi/domain-inventory test
```

## Dependencias

- `@zahavi/domain-shared-kernel`
- Sin dependencias externas.
