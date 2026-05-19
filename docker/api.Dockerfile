FROM node:20-alpine AS base
RUN corepack enable pnpm

WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar la cache de Docker
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/api/package.json ./backend/api/
COPY backend/domain/identity/package.json ./backend/domain/identity/
COPY backend/domain/catalog/package.json ./backend/domain/catalog/
COPY backend/domain/inventory/package.json ./backend/domain/inventory/
COPY backend/domain/production/package.json ./backend/domain/production/
COPY backend/domain/sales/package.json ./backend/domain/sales/
COPY backend/domain/reporting/package.json ./backend/domain/reporting/
COPY backend/domain/shared-kernel/package.json ./backend/domain/shared-kernel/
COPY backend/application/package.json ./backend/application/
COPY backend/ports/package.json ./backend/ports/
COPY backend/adapters/persistence-supabase/package.json ./backend/adapters/persistence-supabase/
COPY backend/shared/package.json ./backend/shared/

RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY backend ./backend

# Build
RUN pnpm --filter @zahavi/api build

FROM node:20-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/backend/api/package.json ./backend/api/
COPY --from=base /app/backend/domain/identity/package.json ./backend/domain/identity/
COPY --from=base /app/backend/domain/catalog/package.json ./backend/domain/catalog/
COPY --from=base /app/backend/domain/inventory/package.json ./backend/domain/inventory/
COPY --from=base /app/backend/domain/production/package.json ./backend/domain/production/
COPY --from=base /app/backend/domain/sales/package.json ./backend/domain/sales/
COPY --from=base /app/backend/domain/reporting/package.json ./backend/domain/reporting/
COPY --from=base /app/backend/domain/shared-kernel/package.json ./backend/domain/shared-kernel/
COPY --from=base /app/backend/application/package.json ./backend/application/
COPY --from=base /app/backend/ports/package.json ./backend/ports/
COPY --from=base /app/backend/adapters/persistence-supabase/package.json ./backend/adapters/persistence-supabase/
COPY --from=base /app/backend/shared/package.json ./backend/shared/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/backend/api/dist ./backend/api/dist
COPY --from=base /app/backend/domain/identity/dist ./backend/domain/identity/dist
COPY --from=base /app/backend/domain/catalog/dist ./backend/domain/catalog/dist
COPY --from=base /app/backend/domain/inventory/dist ./backend/domain/inventory/dist
COPY --from=base /app/backend/domain/production/dist ./backend/domain/production/dist
COPY --from=base /app/backend/domain/sales/dist ./backend/domain/sales/dist
COPY --from=base /app/backend/domain/reporting/dist ./backend/domain/reporting/dist
COPY --from=base /app/backend/domain/shared-kernel/dist ./backend/domain/shared-kernel/dist
COPY --from=base /app/backend/application/dist ./backend/application/dist
COPY --from=base /app/backend/ports/dist ./backend/ports/dist
COPY --from=base /app/backend/adapters/persistence-supabase/dist ./backend/adapters/persistence-supabase/dist
COPY --from=base /app/backend/shared/dist ./backend/shared/dist

EXPOSE 3000

CMD ["node", "backend/api/dist/index.js"]
