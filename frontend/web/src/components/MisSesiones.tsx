import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

interface ResumenSesion {
  sesionId: string;
  rol: string;
  iniciadaEn: string;
  ultimaActividadEn: string;
  expiraEn: string;
  contextoDispositivo: string;
}

interface SesionesResponse {
  sesiones: ResumenSesion[];
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  onCerrar: () => void;
}

export function MisSesiones({ onCerrar }: Props) {
  const { usuarioId } = useAuthStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SesionesResponse>({
    queryKey: ['mis-sesiones'],
    queryFn: () => api.get<SesionesResponse>('/identity/sesiones'),
  });

  const cerrar = useMutation({
    mutationFn: (sesionId: string) => api.post(`/identity/sesiones/${sesionId}/cerrar`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mis-sesiones'] });
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al cerrar sesión'),
  });

  const sesiones = data?.sesiones ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mis sesiones activas"
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-gray-800">Sesiones activas</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar panel"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="animate-pulse space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && sesiones.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">Sin sesiones activas.</p>
          )}

          {sesiones.map((s) => {
            const esCurrent = s.sesionId === usuarioId;
            return (
              <div
                key={s.sesionId}
                className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{s.rol}</span>
                    {esCurrent && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                        actual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Inició: {formatFecha(s.iniciadaEn)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Última actividad: {formatFecha(s.ultimaActividadEn)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    cerrar.mutate(s.sesionId);
                  }}
                  disabled={cerrar.isPending}
                  aria-label={`Cerrar sesión iniciada el ${formatFecha(s.iniciadaEn)}`}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 whitespace-nowrap"
                >
                  Cerrar
                </button>
              </div>
            );
          })}

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="p-4 border-t">
          <p className="text-xs text-gray-400 text-center">
            Cierra sesiones antiguas si alcanzaste el límite de 5 simultáneas.
          </p>
        </div>
      </div>
    </div>
  );
}
