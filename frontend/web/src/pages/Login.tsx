import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';
import type { Rol } from '../stores/auth.js';

interface LoginResponse {
  token: string;
  usuarioId: string;
  rol: Rol;
  businessUnitId: string | null;
}

export function Login() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = {
        tipo: 'navegador',
        email,
        contrasenaEnClaro: contrasena,
      };
      if (totp) body['codigoTotp'] = totp;

      const res = await api.post<LoginResponse>('/identity/sesiones', body);
      setAuth(res.token, res.usuarioId, res.rol, res.businessUnitId);
      navigate('/mesas');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="surface w-full max-w-sm p-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Zahavi
        </p>
        <h1 className="text-3xl font-black text-slate-950 mb-6 text-center">POS operativo</h1>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="block text-sm text-gray-600 mb-1">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm text-gray-600 mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="field"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="login-totp" className="block text-sm text-gray-600 mb-1">
              Código TOTP <span className="text-gray-400">(si tienes 2FA activo)</span>
            </label>
            <input
              id="login-totp"
              type="text"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              maxLength={6}
              className="field"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
