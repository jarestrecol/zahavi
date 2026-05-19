import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ResumenOrden {
  ordenId: string;
  varianteId: string;
  recetaId: string;
  cantidadAProducir: number;
  estado: string;
  lote: { codigo: string; cantidadProducida: number; producidoEn: string } | null;
  creadaEn: string;
}

interface OrdenesResponse {
  ordenes: ResumenOrden[];
}

interface ResumenDespacho {
  despachoId: string;
  codigoLote: string;
  cantidadDespachada: number;
  puntoDeVentaDestinoId: string;
  estado: string;
  creadoEn: string;
}

interface DespachosResponse {
  despachos: ResumenDespacho[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_ORDEN_LABEL: Record<string, { label: string; color: string }> = {
  PLANIFICADA: { label: 'Planificada', color: 'bg-gray-100 text-gray-700' },
  RESERVADA: { label: 'Reservada', color: 'bg-yellow-100 text-yellow-700' },
  EN_EJECUCION: { label: 'En ejecución', color: 'bg-blue-100 text-blue-700' },
  EJECUTADA: { label: 'Ejecutada', color: 'bg-emerald-100 text-emerald-700' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

const ESTADO_DESPACHO_LABEL: Record<string, { label: string; color: string }> = {
  PREPARADO: { label: 'Preparado', color: 'bg-gray-100 text-gray-700' },
  EN_TRANSITO: { label: 'En tránsito', color: 'bg-blue-100 text-blue-700' },
  ENTREGADO: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

function Badge({ estado, map }: { estado: string; map: typeof ESTADO_ORDEN_LABEL }) {
  const entry = map[estado] ?? { label: estado, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.color}`}>
      {entry.label}
    </span>
  );
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

// ── Panel de despachos de una orden ──────────────────────────────────────────

function PanelDespachos({ orden, onCerrar }: { orden: ResumenOrden; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [motivoCancelar, setMotivoCancelar] = useState('');
  const [cancelando, setCancelando] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DespachosResponse>({
    queryKey: ['despachos', orden.ordenId],
    queryFn: () =>
      api.get<DespachosResponse>(
        `/production/dispatches?ordenId=${encodeURIComponent(orden.ordenId)}`,
      ),
    enabled: !!token,
  });

  const enviar = useMutation({
    mutationFn: (despachoId: string) =>
      api.post(`/production/dispatches/${despachoId}/enviar`, { confirmar: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['despachos', orden.ordenId] });
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al enviar'),
  });

  const cancelar = useMutation({
    mutationFn: ({ despachoId, motivo }: { despachoId: string; motivo: string }) =>
      api.delete(`/production/dispatches/${despachoId}`, { motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['despachos', orden.ordenId] });
      setCancelando(null);
      setMotivoCancelar('');
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al cancelar'),
  });

  const despachos = data?.despachos ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Despachos de la orden"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Despachos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Orden · {orden.lote?.codigo ?? '—'}</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar panel"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="animate-pulse space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && despachos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">Sin despachos para esta orden.</p>
          )}

          {despachos.map((d) => (
            <div key={d.despachoId} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Lote {d.codigoLote}</span>
                <Badge estado={d.estado} map={ESTADO_DESPACHO_LABEL} />
              </div>
              <p className="text-xs text-gray-500">
                {d.cantidadDespachada} unidades · {formatFecha(d.creadoEn)}
              </p>

              {d.estado === 'PREPARADO' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => enviar.mutate(d.despachoId)}
                    disabled={enviar.isPending}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => setCancelando(d.despachoId)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {cancelando === d.despachoId && (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Motivo de cancelación"
                    value={motivoCancelar}
                    onChange={(e) => setMotivoCancelar(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        cancelar.mutate({ despachoId: d.despachoId, motivo: motivoCancelar })
                      }
                      disabled={cancelar.isPending || !motivoCancelar.trim()}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => {
                        setCancelando(null);
                        setMotivoCancelar('');
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal nueva orden ─────────────────────────────────────────────────────────

interface FormNuevaOrden {
  varianteId: string;
  recetaId: string;
  cantidadAProducir: string;
}

function ModalNuevaOrden({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormNuevaOrden>({
    varianteId: '',
    recetaId: '',
    cantidadAProducir: '',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: (data: { varianteId: string; recetaId: string; cantidadAProducir: number }) =>
      api.post('/production/orders', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ordenes-produccion'] });
      onCerrar();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al crear orden'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cantidad = parseInt(form.cantidadAProducir, 10);
    if (!form.varianteId || !form.recetaId || isNaN(cantidad) || cantidad < 1) {
      setError('Todos los campos son obligatorios y la cantidad debe ser >= 1');
      return;
    }
    setError(null);
    crear.mutate({
      varianteId: form.varianteId,
      recetaId: form.recetaId,
      cantidadAProducir: cantidad,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nueva orden de producción"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-gray-800">Nueva orden de producción</h2>

        <div className="space-y-1">
          <label htmlFor="varianteId" className="text-xs font-medium text-gray-600">
            ID de variante
          </label>
          <input
            id="varianteId"
            type="text"
            placeholder="UUID de la variante"
            value={form.varianteId}
            onChange={(e) => setForm({ ...form, varianteId: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="recetaId" className="text-xs font-medium text-gray-600">
            ID de receta
          </label>
          <input
            id="recetaId"
            type="text"
            placeholder="UUID de la receta"
            value={form.recetaId}
            onChange={(e) => setForm({ ...form, recetaId: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="cantidad" className="text-xs font-medium text-gray-600">
            Cantidad a producir
          </label>
          <input
            id="cantidad"
            type="number"
            min={1}
            placeholder="Ej: 50"
            value={form.cantidadAProducir}
            onChange={(e) => setForm({ ...form, cantidadAProducir: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={crear.isPending}
            className="flex-1 bg-brand-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {crear.isPending ? 'Creando...' : 'Crear orden'}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Panel de acciones sobre una orden ────────────────────────────────────────

function PanelAccionOrden({
  orden,
  onActualizar,
}: {
  orden: ResumenOrden;
  onActualizar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [mostrarEjecutar, setMostrarEjecutar] = useState(false);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [mostrarDespacho, setMostrarDespacho] = useState(false);
  const [formEjecutar, setFormEjecutar] = useState({ cantidadProducida: '', codigoLote: '' });
  const [motivoCancelar, setMotivoCancelar] = useState('');
  const [formDespacho, setFormDespacho] = useState({ cantidadDespachada: '', puntoDestinoId: '' });

  const calcularBOM = useMutation({
    mutationFn: () => api.post(`/production/orders/${orden.ordenId}/bom`, { confirmar: true }),
    onSuccess: () => {
      onActualizar();
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al calcular BOM'),
  });

  const iniciar = useMutation({
    mutationFn: () => api.post(`/production/orders/${orden.ordenId}/iniciar`, {}),
    onSuccess: () => {
      onActualizar();
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al iniciar'),
  });

  const ejecutar = useMutation({
    mutationFn: (data: { cantidadProducida: number; codigoLote: string }) =>
      api.post(`/production/orders/${orden.ordenId}/ejecutar`, data),
    onSuccess: () => {
      onActualizar();
      setMostrarEjecutar(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al ejecutar'),
  });

  const cancelar = useMutation({
    mutationFn: (motivo: string) => api.delete(`/production/orders/${orden.ordenId}`, { motivo }),
    onSuccess: () => {
      onActualizar();
      setMostrarCancelar(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al cancelar'),
  });

  const prepararDespacho = useMutation({
    mutationFn: (data: { cantidadDespachada: number; puntoDeVentaDestinoId: string }) =>
      api.post('/production/dispatches', { ordenId: orden.ordenId, ...data }),
    onSuccess: () => {
      onActualizar();
      setMostrarDespacho(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al preparar despacho'),
  });

  function submitEjecutar(e: React.FormEvent) {
    e.preventDefault();
    const cantidad = parseInt(formEjecutar.cantidadProducida, 10);
    if (isNaN(cantidad) || cantidad < 1 || !formEjecutar.codigoLote.trim()) {
      setError('Cantidad y código de lote son obligatorios');
      return;
    }
    ejecutar.mutate({ cantidadProducida: cantidad, codigoLote: formEjecutar.codigoLote.trim() });
  }

  function submitDespacho(e: React.FormEvent) {
    e.preventDefault();
    const cantidad = parseInt(formDespacho.cantidadDespachada, 10);
    if (isNaN(cantidad) || cantidad < 1 || !formDespacho.puntoDestinoId.trim()) {
      setError('Cantidad y punto destino son obligatorios');
      return;
    }
    prepararDespacho.mutate({
      cantidadDespachada: cantidad,
      puntoDeVentaDestinoId: formDespacho.puntoDestinoId.trim(),
    });
  }

  const { estado } = orden;

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {estado === 'PLANIFICADA' && (
          <>
            <button
              onClick={() => calcularBOM.mutate()}
              disabled={calcularBOM.isPending}
              className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              Calcular BOM
            </button>
            <button
              onClick={() => setMostrarCancelar(true)}
              className="text-xs text-red-500 hover:underline"
            >
              Cancelar
            </button>
          </>
        )}
        {estado === 'RESERVADA' && (
          <>
            <button
              onClick={() => iniciar.mutate()}
              disabled={iniciar.isPending}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Iniciar ejecución
            </button>
            <button
              onClick={() => setMostrarCancelar(true)}
              className="text-xs text-red-500 hover:underline"
            >
              Cancelar
            </button>
          </>
        )}
        {estado === 'EN_EJECUCION' && (
          <button
            onClick={() => setMostrarEjecutar(true)}
            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
          >
            Cerrar producción
          </button>
        )}
        {estado === 'EJECUTADA' && (
          <button
            onClick={() => setMostrarDespacho(true)}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
          >
            Preparar despacho
          </button>
        )}
      </div>

      {mostrarEjecutar && (
        <form onSubmit={submitEjecutar} className="bg-gray-50 rounded-xl p-3 space-y-2 mt-2">
          <p className="text-xs font-medium text-gray-700">Cerrar producción</p>
          <input
            type="number"
            min={1}
            placeholder="Cantidad producida"
            value={formEjecutar.cantidadProducida}
            onChange={(e) =>
              setFormEjecutar({ ...formEjecutar, cantidadProducida: e.target.value })
            }
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            placeholder="Código de lote (ej: LOTE-2026-001)"
            value={formEjecutar.codigoLote}
            onChange={(e) => setFormEjecutar({ ...formEjecutar, codigoLote: e.target.value })}
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ejecutar.isPending}
              className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setMostrarEjecutar(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Descartar
            </button>
          </div>
        </form>
      )}

      {mostrarDespacho && (
        <form onSubmit={submitDespacho} className="bg-gray-50 rounded-xl p-3 space-y-2 mt-2">
          <p className="text-xs font-medium text-gray-700">
            Preparar despacho · lote {orden.lote?.codigo}
          </p>
          <input
            type="number"
            min={1}
            max={orden.lote?.cantidadProducida ?? undefined}
            placeholder={`Cantidad (máx ${orden.lote?.cantidadProducida ?? '?'})`}
            value={formDespacho.cantidadDespachada}
            onChange={(e) =>
              setFormDespacho({ ...formDespacho, cantidadDespachada: e.target.value })
            }
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            placeholder="UUID del punto de venta destino"
            value={formDespacho.puntoDestinoId}
            onChange={(e) => setFormDespacho({ ...formDespacho, puntoDestinoId: e.target.value })}
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={prepararDespacho.isPending}
              className="text-xs bg-brand-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
            >
              Preparar
            </button>
            <button
              type="button"
              onClick={() => setMostrarDespacho(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Descartar
            </button>
          </div>
        </form>
      )}

      {mostrarCancelar && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 mt-2">
          <p className="text-xs font-medium text-red-700">Cancelar orden</p>
          <input
            type="text"
            placeholder="Motivo de cancelación"
            value={motivoCancelar}
            onChange={(e) => setMotivoCancelar(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => cancelar.mutate(motivoCancelar)}
              disabled={cancelar.isPending || !motivoCancelar.trim()}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              onClick={() => {
                setMostrarCancelar(false);
                setMotivoCancelar('');
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Produccion() {
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [ordenConDespachos, setOrdenConDespachos] = useState<ResumenOrden | null>(null);
  const [mostrarNuevaOrden, setMostrarNuevaOrden] = useState(false);

  const { data, isLoading, isError } = useQuery<OrdenesResponse>({
    queryKey: ['ordenes-produccion', filtroEstado],
    queryFn: () =>
      api.get<OrdenesResponse>(
        `/production/orders${filtroEstado ? `?estado=${encodeURIComponent(filtroEstado)}` : ''}`,
      ),
    refetchInterval: 30_000,
  });

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['ordenes-produccion'] });
  }

  const ordenes = data?.ordenes ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Producción</h1>
        <button
          onClick={() => setMostrarNuevaOrden(true)}
          className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
        >
          Nueva orden
        </button>
      </div>

      {/* Filtro de estado */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PLANIFICADA', 'RESERVADA', 'EN_EJECUCION', 'EJECUTADA', 'CANCELADA'].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filtroEstado === e
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}
          >
            {e === '' ? 'Todas' : (ESTADO_ORDEN_LABEL[e]?.label ?? e)}
          </button>
        ))}
      </div>

      {/* Lista de órdenes */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Error al cargar órdenes. Verifica que la API esté corriendo.
        </div>
      )}

      {!isLoading && !isError && ordenes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">Sin órdenes de producción.</p>
          <p className="text-sm mt-1">Crea una nueva orden para comenzar.</p>
        </div>
      )}

      <div className="space-y-3">
        {ordenes.map((o) => {
          const estadoInfo = ESTADO_ORDEN_LABEL[o.estado] ?? {
            label: o.estado,
            color: 'bg-gray-100 text-gray-700',
          };
          return (
            <div key={o.ordenId} className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {o.lote ? `Lote ${o.lote.codigo}` : `Orden ${o.ordenId.slice(0, 8)}…`}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoInfo.color}`}
                    >
                      {estadoInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {o.cantidadAProducir} uds · {formatFecha(o.creadaEn)}
                    {o.lote && ` · Producidas: ${o.lote.cantidadProducida}`}
                  </p>
                </div>
                {o.estado === 'EJECUTADA' && (
                  <button
                    onClick={() => setOrdenConDespachos(o)}
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    Ver despachos
                  </button>
                )}
              </div>

              {o.estado !== 'EJECUTADA' && o.estado !== 'CANCELADA' && (
                <PanelAccionOrden orden={o} onActualizar={invalidar} />
              )}
            </div>
          );
        })}
      </div>

      {mostrarNuevaOrden && <ModalNuevaOrden onCerrar={() => setMostrarNuevaOrden(false)} />}
      {ordenConDespachos && (
        <PanelDespachos orden={ordenConDespachos} onCerrar={() => setOrdenConDespachos(null)} />
      )}
    </div>
  );
}
