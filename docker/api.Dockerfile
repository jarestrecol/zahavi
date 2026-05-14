FROM node:20-alpine AS base
RUN corepack enable pnpm

WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar la cache de Docker
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/domain/identity/package.json ./packages/domain/identity/
COPY packages/domain/catalog/package.json ./packages/domain/catalog/
COPY packages/domain/inventory/package.json ./packages/domain/inventory/
COPY packages/domain/shared-kernel/package.json ./packages/domain/shared-kernel/
COPY packages/application/package.json ./packages/application/
COPY packages/ports/package.json ./packages/ports/
COPY packages/adapters/persistence-supabase/package.json ./packages/adapters/persistence-supabase/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN pnpm --filter @zahavi/api build

FROM node:20-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/packages/domain/identity/package.json ./packages/domain/identity/
COPY --from=base /app/packages/domain/catalog/package.json ./packages/domain/catalog/
COPY --from=base /app/packages/domain/inventory/package.json ./packages/domain/inventory/
COPY --from=base /app/packages/domain/shared-kernel/package.json ./packages/domain/shared-kernel/
COPY --from=base /app/packages/application/package.json ./packages/application/
COPY --from=base /app/packages/ports/package.json ./packages/ports/
COPY --from=base /app/packages/adapters/persistence-supabase/package.json ./packages/adapters/persistence-supabase/
COPY --from=base /app/packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/packages/domain/identity/dist ./packages/domain/identity/dist
COPY --from=base /app/packages/domain/catalog/dist ./packages/domain/catalog/dist
COPY --from=base /app/packages/domain/inventory/dist ./packages/domain/inventory/dist
COPY --from=base /app/packages/domain/shared-kernel/dist ./packages/domain/shared-kernel/dist
COPY --from=base /app/packages/application/dist ./packages/application/dist
COPY --from=base /app/packages/ports/dist ./packages/ports/dist
COPY --from=base /app/packages/adapters/persistence-supabase/dist ./packages/adapters/persistence-supabase/dist
COPY --from=base /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
