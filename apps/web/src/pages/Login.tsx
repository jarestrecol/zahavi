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
      navigate('/productos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand-700 mb-6 text-center">Zahavi POS</h1>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Código TOTP <span className="text-gray-400">(si tienes 2FA activo)</span>
            </label>
            <input
              type="text"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              maxLength={6}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 text-white py-2 rounded font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
