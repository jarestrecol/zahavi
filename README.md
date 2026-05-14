# Zahavi POS

Sistema de punto de venta para panadería-cafetería con múltiples unidades de negocio. Arquitectura hexagonal + DDD + multi-tenant.

## Cómo arrancar (3 comandos)

```sh
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar base de datos + API + Frontend
docker compose -f docker/docker-compose.yml up --build

# 3. (Primera vez) Aplicar seeds de datos de prueba
pnpm db:seed
```

La app queda disponible en `http://localhost:5173`.

> **Nota:** Docker requiere virtualización habilitada en BIOS. Ver D-001 en `PROYECTO_ESTADO.md`.

## Usuarios de prueba (tras `pnpm db:seed`)

| Email | Contraseña | Rol |
|---|---|---|
| julian@zahavi.local | Ver `.env` | SUPERADMIN |
| admin@zahavi.local | Ver `.env` | ADMIN |
| worker@zahavi.local | — (acceso por PIN en tablet) | WORKER |

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker Desktop (con virtualización BIOS habilitada)

## Estructura del proyecto

```
apps/
  api/     — Backend HTTP (Fastify, puerto 3000)
  web/     — Frontend React PWA (Vite, puerto 5173)
  cli/     — CLI admin (oclif, futuro)
packages/
  domain/           — Núcleo puro DDD (identity, catalog, inventory, ...)
  application/      — Casos de uso por bounded context
  ports/            — Interfaces (puertos) de infraestructura
  adapters/         — Implementaciones concretas (Supabase, etc.)
db/
  migrations/       — Migraciones SQL up/down
  seeds/            — Data inicial de desarrollo
docker/
  docker-compose.yml
  api.Dockerfile
  web.Dockerfile
docs/
  adr/              — Architecture Decision Records
```

## Documentación

- [Estado del proyecto](PROYECTO_ESTADO.md) — avance, checklists, deuda técnica
- [Constitución del proyecto](CLAUDE.md) — reglas de arquitectura y workflow
- [ADRs](docs/adr/INDEX.md) — decisiones arquitectónicas

## Stack técnico

TypeScript 5 strict · Fastify · Zod · PostgreSQL 15 (Supabase) · Kysely · React 18 · Vite · Tailwind · TanStack Query · Zustand · Vitest · Playwright · pnpm Turborepo
