# Glosario — Bounded Context Sales (Ventas)

## Términos del lenguaje ubicuo

| Término | Definición |
|---|---|
| **Mesa** | Superficie física donde se atiende a un grupo de clientes. Puede ser una mesa del catálogo (configurada por ADMIN) o una mesa ad-hoc (creada por el mesero en el momento, p.ej. "Mostrador", "Para llevar"). |
| **Mesa ad-hoc** | Mesa creada espontáneamente por el mesero. No pertenece al catálogo permanente. |
| **Comanda** | Registro de los productos pedidos por un grupo de clientes en una mesa durante una visita. Es el objeto central del proceso de atención. |
| **Línea de comanda** | Un ítem individual dentro de una comanda: producto + cantidad + precio + IVA aplicable en el momento de la venta. |
| **Cobro** | Registro del proceso de pago de una comanda. Puede contener múltiples pagos (efectivo, tarjeta, NEQUI, etc.). |
| **Factura** | Documento de cobro interno (recibo) generado tras un cobro exitoso. Contiene un snapshot de las líneas y totales. No es factura electrónica DIAN (queda para Iteración 7). |
| **Mesero** | Rol de usuario que toma comandas y gestiona mesas. |
| **Cajero** | Rol de usuario que procesa cobros y emite facturas. En Zahavi, el ADMIN puede actuar como cajero. |
| **IVA** | Impuesto al Valor Agregado. En Colombia: 0% para alimentos básicos, 19% tarifa general. Se aplica por línea de comanda según la clasificación del producto en Catalog. |
| **Tasa de IVA** | Valor numérico: 0 ó 0.19. Configurado en el producto (BC Catalog) y snapshot-eado en cada línea. |
| **Método de pago** | Forma de pago: EFECTIVO, TARJETA, TRANSFERENCIA, NEQUI, DATAFONO. |
| **Cambio** | Diferencia entre lo pagado y el total de la comanda cuando se paga de más. Solo aplica a pagos en efectivo conceptualmente, pero el dominio lo calcula independientemente. |
| **Punto de venta** | Uno de los establecimientos del negocio (ej. Sucursal Norte, Sucursal Centro). Identificado por `business_unit_id`. Multi-tenant: toda venta está vinculada a un punto de venta. |
| **Snapshot de línea** | Copia inmutable del nombre y precio del producto en el momento de la venta. Garantiza que cambios futuros en el catálogo no afecten facturas históricas. |

## Acrónimos

- **BC**: Bounded Context
- **ACL**: Anti-Corruption Layer
- **VO**: Value Object
- **IVA**: Impuesto al Valor Agregado
- **COP**: Peso colombiano (moneda)
- **DIAN**: Dirección de Impuestos y Aduanas Nacionales (Colombia)
