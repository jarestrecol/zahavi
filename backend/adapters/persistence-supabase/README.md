# @zahavi/adapter-persistence-supabase

Implementaciones concretas de los puertos de persistencia usando Supabase (PostgreSQL 15+) con Kysely como query builder tipado.

## Estructura

```
src/
├── identity/      — Repositorios de Usuario, Sesion, Dispositivo, Unidades de Negocio
│   ├── factory.ts — createIdentityAdapters(databaseUrl): IdentityAdapters
│   └── ...
├── catalog/       — Repositorios de Catalog (productos, recetas, combos)
│   └── factory.ts — createCatalogAdapters(databaseUrl)
└── inventory/     — Repositorios de Inventory (ingredientes, stock, movimientos)
    └── factory.ts — createInventoryAdapters(databaseUrl)
```

## Contratos exportados

- `createIdentityAdapters(databaseUrl: string): IdentityAdapters`
- `createCatalogAdapters(databaseUrl: string): CatalogAdapters`
- `createInventoryAdapters(databaseUrl: string): InventoryAdapters`

Cada `*Adapters` es el conjunto de implementaciones de puertos que el composition root de la API necesita.

## Seguridad

- Todas las queries usan Kysely con parámetros tipados — cero concatenación de strings SQL.
- No se usa `service_role` directamente; las conexiones van con credenciales de usuario o JWT.
- RLS habilitada en todas las tablas.

## Cómo correr tests

```sh
pnpm --filter @zahavi/adapter-persistence-supabase test
```

Los tests de integración requieren Supabase local corriendo (ver D-002, D-003 en PROYECTO_ESTADO.md).

## Dependencias

- `@zahavi/ports`
- `@zahavi/domain-identity`, `@zahavi/domain-catalog`, `@zahavi/domain-inventory`
- `kysely`, `pg`, `bcrypt`, `otplib`
