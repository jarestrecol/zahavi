# @zahavi/domain-catalog

Núcleo del bounded context Catalog. Gestiona el catálogo de productos, recetas, combos y categorías. No importa ninguna dependencia externa.

## Aggregates

| Aggregate | Responsabilidad |
|---|---|
| `Product` | Producto con precio, margen, categoría y variantes |
| `ProductVariant` | Variantes de un producto (tamaño, sabor, etc.) |
| `Recipe` | Receta: lista de ingredientes con cantidades para producir un producto |
| `Combo` | Agrupación de productos con precio especial |
| `Category` | Categoría jerárquica del catálogo |

## Value Objects

`Money` (COP sin decimales), `Cantidad`, `NombreDeCatalogo`, `Margen`, `FechaHora`, 8 tipos de ID.

## Domain Events

23 eventos: `ProductoCreado`, `PrecioActualizado`, `RecetaDefinida`, `ComboCrrado`, etc.

## Errores de dominio

28 errores tipados. Ver `src/errors/`.

## ACL cross-BC

Catalog consulta costos de ingredientes de Inventory a través del ACL `ConsultorDeCostosDeIngredientes` (ver ADR-0002). El dominio Catalog no depende del dominio Inventory.

## Cómo correr tests

```sh
pnpm --filter @zahavi/domain-catalog test
```

## Dependencias

- `@zahavi/domain-shared-kernel`
- Sin dependencias externas.
