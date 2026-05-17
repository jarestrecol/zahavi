# @zahavi/api — Backend HTTP (Fastify)

Adaptador de entrada HTTP para el sistema Zahavi POS. Expone los casos de uso del dominio como una API REST a través de Fastify. Deployed en Render.

## URLs

| Entorno | URL |
|---|---|
| Producción | `https://zahavi-api.onrender.com` |
| Local | `http://localhost:3000` |

## Endpoints expuestos

| BC | Prefijo | Endpoints |
|---|---|---|
| Identity | `/identity` | POST /sesiones, POST /sesiones/:id/cerrar, DELETE /sesiones/:id, POST /usuarios, PUT /usuarios/:id/rol, POST /totp/iniciar, POST /totp/confirmar, POST /contexto/cambiar, GET /unidades-de-negocio |
| Catalog | `/catalog` | POST /productos, POST /productos/:id/activar, POST /productos/:id/archivar, POST /categorias, POST /categorias/:id/archivar, POST /recetas, POST /recetas/:id/escandallo, POST /combos, GET /productos |
| Inventory | `/inventory` | GET /stock, POST /ingredientes, POST /ingredientes/:id/ajuste, POST /proveedores, POST /ordenes, POST /ordenes/:id/recibir, POST /stock, POST /alertas, PUT /alertas/:id/reconocer |
| Production | `/production` | (ver rutas en `src/routes/production/`) |
| Sales | `/sales` | (ver rutas en `src/routes/sales/`) |
| Reporting | `/reporting` | GET /dashboard |
| Health | — | GET /health, GET /health/ready |

## Desarrollo local

```bash
# Crear .env a partir del ejemplo
cp apps/api/.env.example apps/api/.env
# Rellenar DATABASE_URL, JWT_SECRET, CORS_ORIGIN

pnpm --filter @zahavi/api dev
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase Session Pooler) |
| `JWT_SECRET` | Secreto para firmar JWT (mín. 32 caracteres) |
| `CORS_ORIGIN` | URL del frontend (ej. `https://zahavi-web.vercel.app`) |
| `NODE_ENV` | `development` o `production` |
| `PORT` | Puerto HTTP (default: `3000`) |

## Tests

```bash
pnpm --filter @zahavi/api test        # unit + integration
pnpm --filter @zahavi/api e2e         # Playwright (requiere Docker)
pnpm --filter @zahavi/api typecheck
pnpm --filter @zahavi/api lint
```

## Arquitectura interna

```
src/
├── index.ts               # Punto de entrada: crea pool, compone adapters, arranca Fastify
├── server.ts              # Configura Fastify: cors, jwt, rate-limit, pino, error-handler
├── composition/           # Crea casos de uso inyectando adapters (composition root)
├── routes/                # Un directorio por BC; cada archivo = un FastifyPlugin
└── plugins/               # jwt.ts (authenticate, requireRole), error-handler.ts
```

La API no contiene lógica de negocio. Cada handler valida entrada con Zod, delega al caso de uso correspondiente de `@zahavi/application`, y mapea el resultado a un código HTTP.
