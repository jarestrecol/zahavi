import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.js';
import { SwitchContext } from '../components/SwitchContext.js';
import { MisSesiones } from '../components/MisSesiones.js';

const ROL_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  WORKER: 'Trabajador',
};

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
  `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-100 text-brand-700' : 'hover:bg-gray-100 text-gray-600'
  }`;

export function AppLayout() {
  const { rol, logout } = useAuthStore();
  const navigate = useNavigate();
  const online = useOnline();
  const [verSesiones, setVerSesiones] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const esMesaPage =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/mesas/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Banner offline */}
      {!online && (
        <div
          role="alert"
          className="bg-yellow-400 text-gray-900 text-sm text-center py-1.5 px-4 font-medium"
        >
          Sin conexión — los datos pueden estar desactualizados
        </div>
      )}

      {/* Header */}
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <span className="font-bold text-lg tracking-wide select-none">Zahavi POS</span>
        <div className="flex items-center gap-3">
          <SwitchContext />
          <button
            onClick={() => setVerSesiones(true)}
            aria-label="Ver mis sesiones activas"
            className="text-sm opacity-80 hidden sm:block hover:opacity-100 transition-opacity"
          >
            {ROL_LABEL[rol ?? ''] ?? rol}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar nav */}
        <nav
          aria-label="Navegación principal"
          className="w-44 bg-white border-r flex flex-col gap-1 p-2 flex-shrink-0"
        >
          <NavLink to="/mesas" end className={navLinkClass}>
            Mesas
          </NavLink>
          <NavLink to="/productos" className={navLinkClass}>
            Productos
          </NavLink>
          {rol !== 'WORKER' && (
            <>
              <NavLink to="/inventario" className={navLinkClass}>
                Inventario
              </NavLink>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
            </>
          )}
        </nav>

        {/* Contenido principal */}
        <main className={`flex-1 overflow-y-auto ${esMesaPage ? 'p-4' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>

      {verSesiones && <MisSesiones onCerrar={() => setVerSesiones(false)} />}
    </div>
  );
}
