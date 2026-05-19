import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore, type Rol } from './stores/auth.js';
import { Login } from './pages/Login.js';
import { Products } from './pages/Products.js';
import { Inventory } from './pages/Inventory.js';
import { Dashboard } from './pages/Dashboard.js';
import { Mesas } from './pages/Mesas.js';
import { Mesa } from './pages/Mesa.js';
import { AppLayout } from './layouts/AppLayout.js';
import Produccion from './pages/Produccion.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: Rol[] }) {
  const { rol } = useAuthStore();
  if (!rol || !roles.includes(rol)) return <Navigate to="/mesas" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/mesas" replace />} />
          <Route path="/mesas" element={<Mesas />} />
          <Route path="/mesas/:mesaId" element={<Mesa />} />
          <Route
            path="/dashboard"
            element={
              <RequireRole roles={['ADMIN', 'SUPERADMIN']}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route path="/productos" element={<Products />} />
          <Route
            path="/inventario"
            element={
              <RequireRole roles={['ADMIN', 'SUPERADMIN']}>
                <Inventory />
              </RequireRole>
            }
          />
          <Route
            path="/produccion"
            element={
              <RequireRole roles={['ADMIN', 'SUPERADMIN']}>
                <Produccion />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/mesas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
