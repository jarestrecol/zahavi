import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface VentaPorMetodo {
  metodo: string;
  total: number;
  numeroCobros: number;
}

interface VentaPorHora {
  hora: number;
  total: number;
  numeroCobros: number;
}

interface DashboardDelDia {
  fecha: string;
  totalVentas: number;
  numeroCobros: number;
  ticketPromedio: number;
  porMetodo: VentaPorMetodo[];
  porHora: VentaPorHora[];
  facturasEmitidas: number;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
};

function formatCOP(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading, isError, error } = useQuery<DashboardDelDia>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardDelDia>('/api/reporting/dashboard'),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4">
        Error al cargar el dashboard: {error instanceof Error ? error.message : 'Error desconocido'}
      </div>
    );
  }

  if (!data) return null;

  const maxHora = data.porHora.reduce((m, h) => Math.max(m, h.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <span className="text-sm text-gray-500">{data.fecha}</span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Ventas del día" value={formatCOP(data.totalVentas)} />
        <KpiCard label="Cobros procesados" value={String(data.numeroCobros)} />
        <KpiCard label="Ticket promedio" value={formatCOP(data.ticketPromedio)} />
        <KpiCard label="Facturas emitidas" value={String(data.facturasEmitidas)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metodos de pago */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Por método de pago</h2>
          {data.porMetodo.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas registradas hoy.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Metodo</th>
                  <th className="pb-2 text-right">Cobros</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.porMetodo.map((m) => (
                  <tr key={m.metodo} className="border-b last:border-0">
                    <td className="py-2">{METODO_LABEL[m.metodo] ?? m.metodo}</td>
                    <td className="py-2 text-right text-gray-600">{m.numeroCobros}</td>
                    <td className="py-2 text-right font-medium">{formatCOP(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ventas por hora */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Ventas por hora</h2>
          {data.porHora.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas registradas hoy.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {data.porHora.map((h) => {
                const pct = Math.round((h.total / maxHora) * 100);
                return (
                  <div key={h.hora} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-brand-500 rounded-t"
                      style={{ height: `${pct}%`, minHeight: '4px' }}
                      title={`${h.hora}h: ${formatCOP(h.total)}`}
                    />
                    <span className="text-xs text-gray-400">{h.hora}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
