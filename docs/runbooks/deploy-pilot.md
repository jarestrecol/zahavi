# Runbook: Despliegue Piloto Zahavi POS

**Audiencia:** Administrador técnico  
**Duración estimada:** 30-60 minutos primera vez, 5 minutos en actualizaciones

---

## Prerrequisitos

- Node.js 22+ y pnpm 10+
- Supabase CLI: `npm install -g supabase`
- Cuenta en Supabase (plan Free o Pro)
- Cuenta GitHub con acceso al repositorio
- Variables de entorno definidas (ver sección 2)

---

## 1. Crear el proyecto en Supabase cloud

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto: **zahavi-pos** (o similar)
2. Elige región: `South America (São Paulo)` — más cercana a Colombia
3. Anota el **Project ID** (formato `xxxxxxxxxxxxxxxxxxxx`)
4. Anota la **Database Password** que eliges al crear el proyecto

> El plan Free incluye 500 MB de DB, 50.000 usuarios Auth, 5 GB de tráfico — suficiente para el piloto.

---

## 2. Variables de entorno

Crea `.env` en la raíz del repositorio a partir de `.env.example`:

```bash
cp .env.example .env
```

Rellena los valores:

| Variable | Origen | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Supabase > Settings > Database > Connection string (mode=transaction) | `postgresql://...` |
| `SUPABASE_URL` | Supabase > Settings > API > Project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase > Settings > API > anon key | `eyJ...` |
| `JWT_SECRET` | Supabase > Settings > API > JWT secret | (cadena de 64+ chars) |
| `PORT` | Libre | `3000` |
| `CORS_ORIGIN` | URL del frontend | `https://zahavi.example.com` |
| `NODE_ENV` | | `production` |

Para el CI/CD en GitHub, ve a **Settings > Secrets and variables > Actions** y agrega:

| Secret | Descripción |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token — genera en `supabase.com/dashboard/account/tokens` |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base de datos del proyecto |

---

## 3. Vincular el proyecto con Supabase CLI

```bash
# Autenticarse (abre el navegador)
supabase login

# Vincular al proyecto cloud
supabase link --project-ref <PROJECT_ID>
# Introduce la Database Password cuando se solicite
```

---

## 4. Aplicar migraciones

```bash
# Aplica todas las migraciones en supabase/migrations/ en orden
supabase db push
```

Las migraciones se aplican en este orden:
1. `20260506000001` — identity schema + usuarios
2. `20260506000002` — identity sesiones + dispositivos
3. `20260512000001` — catalog schema
4. `20260512000002` — inventory schema
5. `20260514000001` — production schema
6. `20260514000002` — sales schema

Para verificar que se aplicaron:
```bash
supabase migration list
```

---

## 5. Cargar datos iniciales (seed)

```bash
# Configura DATABASE_URL primero en .env
pnpm db:seed
```

Esto crea:
- 2 unidades de negocio (Planta Central + Punto 1)
- 3 usuarios (SUPERADMIN julian@zahavi.local, ADMIN, WORKER)
- 4 categorías de productos
- 20 ingredientes con stock en Planta Central
- 10 productos con variantes y 2 recetas

---

## 6. Desplegar la API en Render.com

El repositorio incluye `render.yaml` en la raíz — Render lo detecta automáticamente.

1. Ve a [render.com](https://render.com) y crea una cuenta (plan Free)
2. **New > Blueprint** — conecta el repositorio `jarestrecol/zahavi`
3. Render detecta `render.yaml` y crea el servicio `zahavi-api` automáticamente
4. En el panel del servicio, ve a **Environment** y configura las variables manuales:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Supabase > Settings > Database > Connection string (mode=**session**, no transaction — la API usa Pool de pg) |
| `CORS_ORIGIN` | La URL de Vercel (la obtienes en el paso 7, ej: `https://zahavi-web.vercel.app`) |

> `JWT_SECRET` se genera automáticamente. `NODE_ENV=production` y `PORT=3000` ya vienen en `render.yaml`.

5. Clic en **Deploy** — el build tarda ~3 min la primera vez.

### Opción B: Railway

1. Nuevo proyecto > **Deploy from GitHub repo** > selecciona `jarestrecol/zahavi`
2. En **Settings > Build**: `pnpm install --frozen-lockfile && pnpm --filter @zahavi/api build`
3. En **Settings > Start**: `node apps/api/dist/index.js`
4. Agrega las mismas variables de entorno

### Opción C: Docker (cuando esté disponible)

```bash
docker compose -f docker/docker-compose.yml up -d
```

> D-001: Docker requiere virtualización habilitada en BIOS.

---

## 7. Desplegar el frontend en Vercel

El directorio `apps/web/` incluye `vercel.json` con la configuración de build y SPA rewrites.

### Opción A: Vercel Dashboard (recomendado)

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. **New Project** > importa `jarestrecol/zahavi`
3. En **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - (Vercel detecta el `vercel.json` automáticamente)
4. Agrega la variable de entorno:
   - `VITE_API_URL` = `https://zahavi-api.onrender.com` (la URL de tu servicio en Render)
5. Clic en **Deploy**

### Opción B: Vercel CLI

```bash
npm install -g vercel
cd apps/web
vercel --prod
# Cuando pregunte por el root directory, confirma apps/web
# Agrega VITE_API_URL en el dashboard o con: vercel env add VITE_API_URL
```

### Opción C: Netlify

Build command: `cd apps/web && pnpm build`, publish dir: `apps/web/dist`. Agrega `VITE_API_URL`.

---

## 8. Verificar despliegue

```bash
# Health check de la API
curl https://<tu-api>/health
# Esperado: {"ok":true}

# Login de prueba
curl -X POST https://<tu-api>/api/identity/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"julian@zahavi.local","contrasenaEnClaro":"<password>"}'
```

Abre el frontend en el navegador y verifica:
- [ ] Login con SUPERADMIN funciona
- [ ] Dashboard carga (aunque sin ventas, muestra 0s)
- [ ] Lista de productos carga desde seed
- [ ] Lista de inventario carga desde seed
- [ ] Cambio de contexto ADMIN funciona

---

## 9. Actualizaciones posteriores

Cada push a `main` dispara automáticamente (via GitHub Actions):
1. Typecheck + lint + tests
2. Scan de secretos (gitleaks)
3. `supabase db push` — aplica migraciones nuevas

Para actualizar el deployment manual:
```bash
git push origin main
# GitHub Actions hace el resto
```

---

## Rollback de emergencia

Si una migración falla en producción:
```bash
# Los scripts de down están en db/migrations/down/
# Conectar directamente a la BD de Supabase y ejecutar el down script correspondiente
psql $DATABASE_URL -f db/migrations/down/0007_sales.sql
```

> Nota: los down scripts de supabase/migrations/ deben crearse manualmente si se necesitan.
