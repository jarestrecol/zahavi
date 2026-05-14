import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore, type Rol } from './stores/auth.js';
import { Login } from './pages/Login.js';
import { Products } from './pages/Products.js';
import { Inventory } from './pages/Inventory.js';
import { Dashboard } from './pages/Dashboard.js';
import { AppLayout } from './layouts/AppLayout.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: Rol[] }) {
  const { rol } = useAuthStore();
  if (!rol || !roles.includes(rol)) return <Navigate to="/productos" replace />;
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
          <Route index element={<Navigate to="/dashboard" replace />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/productos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
