import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

// ── Tipos ──────────────────────────────────────────────────────────────────────

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

interface Movimiento {
  movimientoId: string;
  tipo: string;
  cantidad: number;
  unidad: string;
  creadoEn: string;
  referencia?: string;
  motivo?: string;
}

interface HistoricoResponse {
  movimientos: Movimiento[];
}

type AccionActiva = 'ingreso' | 'salida' | 'historico' | 'nuevoIngrediente' | null;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TIPO_MOV_LABEL: Record<string, { label: string; color: string }> = {
  INGRESO: { label: 'Ingreso', color: 'text-emerald-600' },
  SALIDA: { label: 'Salida', color: 'text-red-600' },
  MERMA: { label: 'Merma', color: 'text-orange-600' },
  PRODUCCION: { label: 'Producción', color: 'text-blue-600' },
  AJUSTE_POSITIVO: { label: 'Ajuste +', color: 'text-emerald-500' },
  AJUSTE_NEGATIVO: { label: 'Ajuste −', color: 'text-red-500' },
};

// ── Panel lateral: Registrar ingreso ──────────────────────────────────────────

function PanelIngreso({
  item,
  onCerrar,
  onExito,
}: {
  item: StockItem;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);

  const registrar = useMutation({
    mutationFn: (data: {
      ingredienteId: string;
      cantidad: number;
      costoUnitarioCop: number;
      supplierId: string;
      referencia?: string;
    }) => api.post('/inventory/movimientos/ingreso', data),
    onSuccess: () => {
      onExito();
      onCerrar();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al registrar ingreso'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cant = parseFloat(cantidad);
    const costoNum = parseFloat(costo);
    if (isNaN(cant) || cant <= 0) {
      setError('La cantidad debe ser mayor a cero');
      return;
    }
    if (isNaN(costoNum) || costoNum < 0) {
      setError('El costo unitario debe ser >= 0');
      return;
    }
    if (!supplierId.trim()) {
      setError('Selecciona o pega el ID del proveedor');
      return;
    }
    setError(null);
    registrar.mutate({
      ingredienteId: item.ingredienteId,
      cantidad: cant,
      costoUnitarioCop: costoNum,
      supplierId: supplierId.trim(),
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Registrar ingreso de ${item.nombre}`}
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Registrar ingreso</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.nombre}</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label htmlFor="cant-ingreso" className="block text-xs font-medium text-gray-700 mb-1">
              Cantidad ({item.unidadNativa})
            </label>
            <input
              id="cant-ingreso"
              type="number"
              min="0.001"
              step="0.001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 10"
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="costo-ingreso" className="block text-xs font-medium text-gray-700 mb-1">
              Costo unitario (COP)
            </label>
            <input
              id="costo-ingreso"
              type="number"
              min="0"
              step="1"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej: 5000"
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="proveedor-ingreso"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Proveedor (UUID)
            </label>
            <input
              id="proveedor-ingreso"
              type="text"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="ID del proveedor"
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="referencia-ingreso"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Referencia / factura (opcional)
            </label>
            <input
              id="referencia-ingreso"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: FAC-001"
              maxLength={100}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registrar.isPending}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {registrar.isPending ? 'Registrando...' : 'Registrar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel lateral: Registrar salida ───────────────────────────────────────────

function PanelSalida({
  item,
  onCerrar,
  onExito,
}: {
  item: StockItem;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);

  const registrar = useMutation({
    mutationFn: (data: {
      ingredienteId: string;
      cantidad: number;
      tipo: 'PRODUCTION_OUT' | 'SALE_OUT';
      referencia: string;
    }) => api.post('/inventory/movimientos/salida', data),
    onSuccess: () => {
      onExito();
      onCerrar();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al registrar salida'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cant = parseFloat(cantidad);
    if (isNaN(cant) || cant <= 0) {
      setError('La cantidad debe ser mayor a cero');
      return;
    }
    if (!referencia.trim()) {
      setError('La referencia es obligatoria');
      return;
    }
    if (cant > item.cantidadDisponible) {
      setError(`Stock insuficiente. Disponible: ${item.cantidadDisponible} ${item.unidadNativa}`);
      return;
    }
    setError(null);
    registrar.mutate({
      ingredienteId: item.ingredienteId,
      cantidad: cant,
      tipo: 'PRODUCTION_OUT',
      referencia: referencia.trim(),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Registrar salida de ${item.nombre}`}
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Registrar salida</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.nombre} · disponible: {item.cantidadDisponible} {item.unidadNativa}
            </p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label htmlFor="cant-salida" className="block text-xs font-medium text-gray-700 mb-1">
              Cantidad ({item.unidadNativa})
            </label>
            <input
              id="cant-salida"
              type="number"
              min="0.001"
              step="0.001"
              max={item.cantidadDisponible}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder={`Máx: ${item.cantidadDisponible}`}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="referencia-salida"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Referencia
            </label>
            <input
              id="referencia-salida"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Uso en producción, evento especial..."
              maxLength={200}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registrar.isPending}
              className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {registrar.isPending ? 'Registrando...' : 'Registrar salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel: Histórico de movimientos ───────────────────────────────────────────

function PanelHistorico({ item, onCerrar }: { item: StockItem; onCerrar: () => void }) {
  const { data, isLoading } = useQuery<HistoricoResponse>({
    queryKey: ['historico-mov', item.ingredienteId],
    queryFn: () =>
      api.get<HistoricoResponse>(
        `/inventory/historico?ingredienteId=${encodeURIComponent(item.ingredienteId)}`,
      ),
  });

  const movimientos = data?.movimientos ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Histórico de ${item.nombre}`}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Histórico de movimientos</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.nombre}</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="animate-pulse space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          )}

          {!isLoading && movimientos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">
              Sin movimientos registrados para este ingrediente.
            </p>
          )}

          {movimientos.map((m) => {
            const tipoInfo = TIPO_MOV_LABEL[m.tipo] ?? { label: m.tipo, color: 'text-gray-600' };
            return (
              <div
                key={m.movimientoId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="min-w-0">
                  <span className={`text-xs font-semibold ${tipoInfo.color}`}>
                    {tipoInfo.label}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatFecha(m.creadoEn)}
                    {m.referencia && ` · ${m.referencia}`}
                    {m.motivo && ` · ${m.motivo}`}
                  </p>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ml-3 ${tipoInfo.color}`}>
                  {m.tipo.startsWith('INGRESO') || m.tipo === 'AJUSTE_POSITIVO' ? '+' : '−'}
                  {m.cantidad} {m.unidad}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PanelNuevoIngrediente({
  onCerrar,
  onExito,
}: {
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [form, setForm] = useState({
    nombre: '',
    unidadNativa: 'unidad',
    costoUnitarioCop: '',
    umbralDeAlerta: '',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      api.post('/inventory/ingredientes', {
        nombre: form.nombre.trim(),
        unidadNativa: form.unidadNativa.trim(),
        costoUnitarioCop: Number(form.costoUnitarioCop),
        ...(form.umbralDeAlerta ? { umbralDeAlerta: Number(form.umbralDeAlerta) } : {}),
      }),
    onSuccess: () => {
      onExito();
      onCerrar();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al crear ingrediente'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.unidadNativa.trim() || Number(form.costoUnitarioCop) < 0) {
      setError('Completa nombre, unidad y costo');
      return;
    }
    setError(null);
    crear.mutate();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3"
      >
        <h2 className="text-base font-semibold text-gray-800">Nuevo ingrediente</h2>
        <input
          className="field"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre"
          autoFocus
        />
        <select
          className="field"
          value={form.unidadNativa}
          onChange={(e) => setForm({ ...form, unidadNativa: e.target.value })}
        >
          <option value="unidad">Unidad</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="L">L</option>
          <option value="mL">mL</option>
        </select>
        <input
          className="field"
          type="number"
          min={0}
          value={form.costoUnitarioCop}
          onChange={(e) => setForm({ ...form, costoUnitarioCop: e.target.value })}
          placeholder="Costo unitario COP"
        />
        <input
          className="field"
          type="number"
          min={0}
          value={form.umbralDeAlerta}
          onChange={(e) => setForm({ ...form, umbralDeAlerta: e.target.value })}
          placeholder="Umbral de alerta"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button className="btn-primary flex-1" disabled={crear.isPending}>
            {crear.isPending ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Componente principal: Inventory ───────────────────────────────────────────

export function Inventory() {
  const { buId } = useAuthStore();
  const queryClient = useQueryClient();

  const [accion, setAccion] = useState<AccionActiva>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState<StockItem | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'alertas'>('todos');

  const { data, isLoading, isError } = useQuery<StockResponse>({
    queryKey: ['stock', buId],
    queryFn: () => api.get<StockResponse>('/inventory/stock'),
    refetchInterval: 30_000,
  });

  function abrirAccion(item: StockItem, tipo: AccionActiva) {
    setItemSeleccionado(item);
    setAccion(tipo);
  }

  function cerrarAccion() {
    setAccion(null);
    setItemSeleccionado(null);
  }

  function invalidarStock() {
    void queryClient.invalidateQueries({ queryKey: ['stock', buId] });
  }

  const todosLosItems = data?.items ?? [];
  const conAlerta = todosLosItems.filter((i) => i.cantidadDisponible <= i.umbralDeAlerta);
  const items = filtro === 'alertas' ? conAlerta : todosLosItems;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
      >
        Error al cargar inventario. Verifica que la API esté corriendo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {todosLosItems.length} ingredientes
            {conAlerta.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {conAlerta.length} bajo alerta
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setAccion('nuevoIngrediente')} className="btn-primary">
          Nuevo ingrediente
        </button>
      </div>

      {/* Banner de alertas */}
      {conAlerta.length > 0 && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3"
        >
          <span className="text-red-500 text-lg" aria-hidden>
            ⚠
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">
              {conAlerta.length} ingrediente{conAlerta.length > 1 ? 's' : ''} bajo el umbral de
              alerta
            </p>
            <p className="text-xs text-red-500 truncate">
              {conAlerta
                .slice(0, 3)
                .map((i) => i.nombre)
                .join(', ')}
              {conAlerta.length > 3 && ` y ${conAlerta.length - 3} más`}
            </p>
          </div>
          <button
            onClick={() => setFiltro(filtro === 'alertas' ? 'todos' : 'alertas')}
            className="text-xs text-red-700 font-medium hover:underline whitespace-nowrap"
          >
            {filtro === 'alertas' ? 'Ver todos' : 'Ver alertas'}
          </button>
        </div>
      )}

      {/* Filtro rápido */}
      <div className="flex gap-2">
        {(['todos', 'alertas'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filtro === f
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}
          >
            {f === 'todos' ? 'Todos' : `Alertas (${conAlerta.length})`}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filtro === 'alertas' ? (
            <p>No hay ingredientes bajo alerta. ¡Excelente nivel de stock!</p>
          ) : (
            <p>No hay stock registrado para esta unidad de negocio.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ingrediente</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Disponible</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                  Umbral
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const bajoAlerta = item.cantidadDisponible <= item.umbralDeAlerta;
                const critico = item.cantidadDisponible === 0;
                return (
                  <tr
                    key={item.ingredienteId}
                    className={`border-b last:border-0 ${
                      critico ? 'bg-red-50' : bajoAlerta ? 'bg-amber-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{item.nombre}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        critico ? 'text-red-600' : bajoAlerta ? 'text-amber-700' : 'text-gray-700'
                      }`}
                    >
                      {item.cantidadDisponible.toLocaleString('es-CO')} {item.unidadNativa}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      {item.umbralDeAlerta} {item.unidadNativa}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          critico
                            ? 'bg-red-100 text-red-700'
                            : bajoAlerta
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {critico ? 'Agotado' : bajoAlerta ? 'Bajo' : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirAccion(item, 'ingreso')}
                          className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-200 font-medium"
                          aria-label={`Registrar ingreso de ${item.nombre}`}
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => abrirAccion(item, 'salida')}
                          disabled={item.cantidadDisponible === 0}
                          className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200 font-medium disabled:opacity-40"
                          aria-label={`Registrar salida de ${item.nombre}`}
                        >
                          − Salida
                        </button>
                        <button
                          onClick={() => abrirAccion(item, 'historico')}
                          className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1"
                          aria-label={`Ver histórico de ${item.nombre}`}
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {accion === 'ingreso' && itemSeleccionado && (
        <PanelIngreso item={itemSeleccionado} onCerrar={cerrarAccion} onExito={invalidarStock} />
      )}
      {accion === 'salida' && itemSeleccionado && (
        <PanelSalida item={itemSeleccionado} onCerrar={cerrarAccion} onExito={invalidarStock} />
      )}
      {accion === 'historico' && itemSeleccionado && (
        <PanelHistorico item={itemSeleccionado} onCerrar={cerrarAccion} />
      )}
      {accion === 'nuevoIngrediente' && (
        <PanelNuevoIngrediente onCerrar={cerrarAccion} onExito={invalidarStock} />
      )}
    </div>
  );
}
