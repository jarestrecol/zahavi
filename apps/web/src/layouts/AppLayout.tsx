import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.js';
import { SwitchContext } from '../components/SwitchContext.js';

const ROL_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  WORKER: 'Trabajador',
};

export function AppLayout() {
  const { rol, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-lg tracking-wide">Zahavi POS</span>
        <div className="flex items-center gap-3">
          <SwitchContext />
          <span className="text-sm opacity-90">{ROL_LABEL[rol ?? ''] ?? rol}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-white text-brand-700 px-3 py-1 rounded hover:bg-brand-50"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-48 bg-white border-r flex flex-col gap-1 p-3 text-sm">
          <Link to="/productos" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700">
            Productos
          </Link>
          {rol !== 'WORKER' && (
            <Link to="/inventario" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700">
              Inventario
            </Link>
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
