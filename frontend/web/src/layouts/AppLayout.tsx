import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MisSesiones } from '../components/MisSesiones.js';
import { SwitchContext } from '../components/SwitchContext.js';
import { useAuthStore } from '../stores/auth.js';

const ROL_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  WORKER: 'Trabajador',
};

const NAV_ITEMS = [
  { to: '/mesas', label: 'Mesas', roles: ['SUPERADMIN', 'ADMIN', 'WORKER'] },
  { to: '/productos', label: 'Productos', roles: ['SUPERADMIN', 'ADMIN', 'WORKER'] },
  { to: '/inventario', label: 'Inventario', roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/produccion', label: 'Produccion', roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/dashboard', label: 'Dashboard', roles: ['SUPERADMIN', 'ADMIN'] },
] as const;

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
      : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
  }`;

export function AppLayout() {
  const { rol, buId, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();
  const [verSesiones, setVerSesiones] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const esMesaPage = location.pathname.startsWith('/mesas/');
  const visibleNav = NAV_ITEMS.filter(
    (item) => rol && (item.roles as readonly string[]).includes(rol),
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {!online && (
        <div
          role="alert"
          className="bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-amber-950"
        >
          Sin conexion. La operacion debe continuar con datos locales cuando el modulo offline este
          activo.
        </div>
      )}

      <div className="flex min-h-screen">
        <nav
          aria-label="Navegacion principal"
          className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 px-4 py-5 lg:flex lg:flex-col"
        >
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Zahavi</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">POS</h1>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Panaderia, cafeteria y planta de produccion.
            </p>
          </div>

          <div className="space-y-1">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/mesas'}
                className={navLinkClass}
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-auto rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">Sesion</p>
            <button
              onClick={() => setVerSesiones(true)}
              className="mt-1 block text-left text-sm font-bold text-slate-900 hover:text-brand-700"
            >
              {ROL_LABEL[rol ?? ''] ?? rol}
            </button>
            <p className="mt-1 truncate text-xs text-slate-400">
              {buId ? `BU ${buId}` : 'Sin unidad activa'}
            </p>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 lg:hidden">
                  Zahavi POS
                </p>
                <p className="truncate text-sm font-semibold text-slate-700">
                  {online ? 'Operacion en linea' : 'Operacion sin conexion'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SwitchContext />
                <button
                  onClick={() => setVerSesiones(true)}
                  aria-label="Ver mis sesiones activas"
                  className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:block"
                >
                  {ROL_LABEL[rol ?? ''] ?? rol}
                </button>
                <button
                  onClick={handleLogout}
                  aria-label="Cerrar sesion"
                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Salir
                </button>
              </div>
            </div>
          </header>

          <main className={`flex-1 overflow-y-auto ${esMesaPage ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
            <Outlet />
          </main>

          <nav
            aria-label="Navegacion movil"
            className="grid grid-cols-5 gap-1 border-t border-slate-200 bg-white p-2 lg:hidden"
          >
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/mesas'}
                className={({ isActive }) =>
                  `rounded-lg px-1 py-2 text-center text-[11px] font-bold ${
                    isActive ? 'bg-slate-950 text-white' : 'text-slate-500'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {verSesiones && <MisSesiones onCerrar={() => setVerSesiones(false)} />}
    </div>
  );
}
