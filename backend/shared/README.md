# @zahavi/shared

Utilidades transversales del monorepo. Puede ser importado por `apps/` y `packages/adapters/`, nunca por `packages/domain/` ni `packages/ports/`.

## Estado actual

El package está creado y reservado para utilidades cross-cutting (logger configurado con Pino, errores de infraestructura compartidos, helpers de entorno). El logger vive actualmente en `apps/api/src/` — se moverá aquí cuando más de una app lo necesite.

## Uso

```bash
pnpm --filter @zahavi/shared build
pnpm --filter @zahavi/shared test
```

## Reglas de uso

- Solo puede importar dependencias externas (Pino, etc.) y `@zahavi/ports`.
- No puede importar bounded contexts del dominio directamente.
