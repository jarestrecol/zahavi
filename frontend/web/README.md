# @zahavi/web — Frontend React PWA

Interfaz de usuario para el sistema Zahavi POS. React 18 + Vite + Tailwind. Deployed en Vercel.

## URLs

| Entorno | URL |
|---|---|
| Producción | `https://zahavi-web.vercel.app` |
| Local | `http://localhost:5173` |

## Credenciales de prueba

| Usuario | Contraseña | Rol | Notas |
|---|---|---|---|
| `admin@zahavi.local` | `Zahavi2026!` | ADMIN | Acceso completo sin TOTP |
| `julian@zahavi.local` | `Zahavi2026!` | SUPERADMIN | Requiere TOTP — no disponible para login sin dispositivo TOTP configurado |

## Pantallas implementadas

| Ruta | Componente | Estado |
|---|---|---|
| `/login` | `Login.tsx` | Completo — email + contraseña + TOTP opcional |
| `/dashboard` | `Dashboard.tsx` | Completo — KPIs del día desde `/reporting/dashboard` |
| `/products` | `Products.tsx` | Completo — lista con búsqueda, precio, estado |
| `/inventory` | `Inventory.tsx` | Completo — stock por BU con alertas |

## Desarrollo local

```bash
# Apuntar al backend local o a producción
echo "VITE_API_URL=http://localhost:3000" > apps/web/.env.local

pnpm --filter @zahavi/web dev
```

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `https://zahavi-api.onrender.com` |

## Tests

```bash
pnpm --filter @zahavi/web test
pnpm --filter @zahavi/web typecheck
pnpm --filter @zahavi/web lint
```

## Arquitectura interna

```
src/
├── main.tsx               # Punto de entrada — QueryClient, Router, StrictMode
├── App.tsx                # Rutas protegidas con ProtectedRoute
├── lib/
│   └── api.ts             # Cliente HTTP (fetch + interceptor JWT + manejo 401)
├── stores/
│   └── auth.ts            # Zustand: token, rol, buId, setBuId, logout
├── pages/                 # Login, Dashboard, Products, Inventory
└── components/
    └── SwitchContext.tsx  # Selector de unidad de negocio (ADMIN/SUPERADMIN)
```

El estado del servidor se gestiona con TanStack Query. El estado de autenticación (JWT, rol, `bu_id`) vive en Zustand con persistencia en `localStorage`.
