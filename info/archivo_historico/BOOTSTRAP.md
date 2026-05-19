# BOOTSTRAP — Scaffolding inicial del proyecto Zahavi

Esta guía contiene los comandos exactos para inicializar el monorepo. **Pega cada bloque a Claude Code** y deja que los ejecute. Detente entre etapas para verificar.

> Antes de empezar: tener instalado Node 20+, pnpm, Git, Docker, Supabase CLI.

---

## Etapa 0 — Inicializar el repositorio

```bash
mkdir zahavi && cd zahavi
git init
pnpm init
```

Crear `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/adapters/*'
```

Crear `.gitignore` mínimo:

```
node_modules
dist
.turbo
coverage
.env
.env.*
!.env.example
*.log
.DS_Store
.vscode
```

Crear `.editorconfig`:

```
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

Copiar a la raíz: `CLAUDE.md`, carpeta `_claude/` renombrada a `.claude/`.

---

## Etapa 1 — Herramientas base

```bash
pnpm add -Dw \
  typescript \
  @types/node \
  turbo \
  vitest \
  @vitest/coverage-v8 \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  eslint-config-prettier \
  husky \
  lint-staged \
  tsx
```

Crear `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

Crear `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": {},
    "lint": {}
  }
}
```

Configurar Husky:

```bash
pnpm exec husky init
echo "pnpm lint-staged" > .husky/pre-commit
```

`package.json` raíz (scripts):

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json,yml}\""
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

---

## Etapa 2 — Estructura de paquetes

```bash
mkdir -p apps/{web,cli,api}
mkdir -p packages/{domain,application,ports,shared}
mkdir -p packages/domain/{shared-kernel,identity,catalog,inventory,production,sales,accounting,auditing}
mkdir -p packages/adapters/{persistence-supabase,persistence-sqlite-offline,messaging-supabase-realtime,printing-escpos,notifications-email,secrets-vault}
mkdir -p db/migrations/{up,down}
mkdir -p docs/{adr,domain-model,api,runbooks,user-guides}
```

Para cada paquete crear `package.json` mínimo y `tsconfig.json` que extienda del base. (Pídele a Claude Code: "genera package.json y tsconfig.json para todos los paquetes según el patrón estándar Turborepo + TypeScript estricto, con paths internos `@zahavi/<paquete>`".)

---

## Etapa 3 — Calidad de código

Crear `.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
  parserOptions: { project: './tsconfig.base.json' },
};
```

Crear `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## Etapa 4 — Supabase local

```bash
supabase init
supabase start
```

Esto levanta Postgres + Auth + Storage en Docker. La service_role key local NO se usa en código; se accede vía variable de entorno solo en backend/Edge Functions.

Crear `.env.example` (ejemplo, sin valores reales):

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY se obtiene de Vault, NO se commitea
```

---

## Etapa 5 — CI/CD

Crear `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - name: gitleaks
        uses: gitleaks/gitleaks-action@v2
      - name: semgrep
        uses: returntocorp/semgrep-action@v1
```

---

## Etapa 6 — Primer ADR

Pídele a Claude Code: "invoca al doc-writer para crear `docs/adr/0001-arquitectura-hexagonal-y-bounded-contexts.md` siguiendo la plantilla". Aprueba o ajusta.

---

## Etapa 7 — Verificación final del bootstrap

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
git add .
git commit -m "chore: bootstrap monorepo con arquitectura hexagonal"
```

Si todo pasa, estás listo para arrancar la **Iteración 1** del archivo `PROMPTS_POR_ITERACION.md`.
