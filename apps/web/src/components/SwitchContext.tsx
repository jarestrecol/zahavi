import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

interface BusinessUnit {
  id: string;
  nombre: string;
}

export function SwitchContext() {
  const { rol, buId, setBuId } = useAuthStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // TODO: implementar GET /identity/unidades en el backend (Bloque 6.7)
  const { data: unidades } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: () => api.get('/identity/unidades'),
    enabled: false,
  });

  if (rol === 'WORKER' || !unidades || unidades.length <= 1) return null;

  async function cambiar(nuevoId: string) {
    if (nuevoId === buId) return;
    setError(null);
    try {
      const res = await api.post<{ token: string; businessUnitId: string }>(
        '/identity/contexto/cambiar',
        { nuevoBusinessUnitId: nuevoId },
      );
      setBuId(res.businessUnitId, res.token);
      await queryClient.invalidateQueries();
    } catch {
      setError('No se pudo cambiar la unidad');
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <select
        value={buId ?? ''}
        onChange={(e) => void cambiar(e.target.value)}
        aria-label="Cambiar unidad de negocio"
        className="text-sm border rounded px-2 py-1 bg-white text-gray-700"
      >
        {!buId && <option value="">Seleccionar unidad</option>}
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
