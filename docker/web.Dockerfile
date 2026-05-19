FROM node:20-alpine
RUN corepack enable pnpm

WORKDIR /app

# Copiar manifiestos primero para cache de dependencias
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/web/package.json ./frontend/web/

RUN pnpm install --frozen-lockfile

# Copiar código fuente del frontend
COPY frontend/web ./frontend/web

EXPOSE 5173

# Vite dev server accesible desde el host
CMD ["pnpm", "--filter", "@zahavi/web", "dev", "--", "--host", "0.0.0.0"]
