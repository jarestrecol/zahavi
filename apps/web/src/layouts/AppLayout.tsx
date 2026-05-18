import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.js';
import { SwitchContext } from '../components/SwitchContext.js';

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
  `px-3 py-2 rounded text-sm ${
    isActive ? 'bg-brand-100 text-brand-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
  }`;

export function AppLayout() {
  const { rol, logout } = useAuthStore();
  const navigate = useNavigate();
  const online = useOnline();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Indicador offline */}
      {!online && (
        <div role="alert" className="bg-yellow-500 text-white text-sm text-center py-1 px-4">
          Sin conexión — los datos pueden estar desactualizados
        </div>
      )}

      {/* Header */}
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-lg tracking-wide">Zahavi POS</span>
        <div className="flex items-center gap-3">
          <SwitchContext />
          <span className="text-sm opacity-90">{ROL_LABEL[rol ?? ''] ?? rol}</span>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="text-sm bg-white text-brand-700 px-4 py-2 rounded hover:bg-brand-50 min-w-[4rem]"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav
          aria-label="Navegación principal"
          className="w-48 bg-white border-r flex flex-col gap-1 p-3"
        >
          {rol !== 'WORKER' && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/productos" className={navLinkClass}>
            Productos
          </NavLink>
          {rol !== 'WORKER' && (
            <NavLink to="/inventario" className={navLinkClass}>
              Inventario
            </NavLink>
          )}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
