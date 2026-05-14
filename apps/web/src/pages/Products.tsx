import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface Product {
  id: string;
  nombre: string;
  categoria: { nombre: string };
  variantes: Array<{ precio_cop: number }>;
  estado: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
}

export function Products() {
  const [busqueda, setBusqueda] = useState('');

  const { data, isLoading, isError } = useQuery<ProductsResponse>({
    queryKey: ['products', busqueda],
    queryFn: () => api.get(`/catalog/products?search=${encodeURIComponent(busqueda)}&limit=50`),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        Error al cargar productos. Verifica que la API esté corriendo.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Productos</h1>
        <input
          type="search"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-56"
        />
      </div>

      {!data?.items?.length ? (
        <div className="text-center py-12 text-gray-400">
          <p>No hay productos disponibles.</p>
          <p className="text-sm mt-1">Ejecuta `pnpm db:seed` para cargar datos de prueba.</p>
        </div>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Categoría</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Precio</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.nombre}</td>
                  <td className="px-4 py-2 text-gray-500">{p.categoria?.nombre ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    {p.variantes?.[0]
                      ? `$ ${p.variantes[0].precio_cop.toLocaleString('es-CO')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.estado === 'publicado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
