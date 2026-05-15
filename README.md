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

## Despliegue en producción (Render + Vercel)

La infraestructura de producción usa:
- **Supabase** — base de datos PostgreSQL cloud (ya aprovisionada, project `cuqxmbbpssoylwaywuhc`)
- **Render** — API Fastify (detecta `render.yaml` automáticamente)
- **Vercel** — frontend React (detecta `apps/web/vercel.json`)

### Resumen de pasos

| # | Plataforma | Acción | Tiempo |
|---|---|---|---|
| 1 | Render | Crear cuenta + conectar repo + configurar vars | ~10 min |
| 2 | Vercel | Crear cuenta + importar repo + configurar `VITE_API_URL` | ~5 min |
| 3 | Ambas | Verificar health check + login SUPERADMIN | ~5 min |

Variables de entorno requeridas: ver [`.env.production.example`](.env.production.example).

Runbook completo con instrucciones detalladas: [`docs/runbooks/deploy-pilot.md`](docs/runbooks/deploy-pilot.md).

### Variables clave

| Variable | Plataforma | Origen |
|---|---|---|
| `DATABASE_URL` | Render | Supabase > Settings > Database > **Session** mode (puerto 5432) |
| `JWT_SECRET` | Render | Generado automáticamente por Render (`generateValue: true`) |
| `CORS_ORIGIN` | Render | URL de Vercel, ej: `https://zahavi-web.vercel.app` |
| `VITE_API_URL` | Vercel | URL de Render, ej: `https://zahavi-api.onrender.com` |

## Documentación

- [Estado del proyecto](PROYECTO_ESTADO.md) — avance, checklists, deuda técnica
- [Constitución del proyecto](CLAUDE.md) — reglas de arquitectura y workflow
- [ADRs](docs/adr/INDEX.md) — decisiones arquitectónicas
- [Runbook de despliegue](docs/runbooks/deploy-pilot.md) — guía paso a paso

## Stack técnico

TypeScript 5 strict · Fastify · Zod · PostgreSQL 15 (Supabase) · Kysely · React 18 · Vite · Tailwind · TanStack Query · Zustand · Vitest · Playwright · pnpm Turborepo
