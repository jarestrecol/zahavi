import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

interface StockItem {
  ingredienteId: string;
  nombre: string;
  cantidadDisponible: number;
  unidadNativa: string;
  umbralDeAlerta: number;
  businessUnitId: string;
}

interface StockResponse {
  items: StockItem[];
}

export function Inventory() {
  const { buId } = useAuthStore();

  const { data, isLoading, isError } = useQuery<StockResponse>({
    queryKey: ['stock', buId],
    queryFn: () =>
      api.get(`/inventory/stock${buId ? `?businessUnitId=${encodeURIComponent(buId)}` : ''}`),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        Error al cargar inventario. Verifica que la API esté corriendo.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Inventario</h1>

      {!data?.items?.length ? (
        <div className="text-center py-12 text-gray-400">
          <p>No hay stock registrado para esta unidad de negocio.</p>
        </div>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Ingrediente</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Disponible</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Alerta</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const bajoDeAlerta = item.cantidadDisponible <= item.umbralDeAlerta;
                return (
                  <tr key={item.ingredienteId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.nombre}</td>
                    <td className="px-4 py-2 text-right">
                      {item.cantidadDisponible.toLocaleString('es-CO')} {item.unidadNativa}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">
                      {item.umbralDeAlerta} {item.unidadNativa}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          bajoDeAlerta ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {bajoDeAlerta ? 'Bajo' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
