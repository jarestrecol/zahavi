import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ResumenMesa {
  mesaId: string;
  nombre: string;
  tipo: string;
  estado: string;
  comandaActivaId: string | null;
}

interface LineaComanda {
  lineaId: string;
  varianteId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitarioCOP: number;
  subtotalConIVA: number;
}

interface DetalleComanda {
  comandaId: string;
  mesaId: string;
  estado: string;
  totalConIVA: number;
  lineas: LineaComanda[];
  abiertaEn: string;
}

interface Variante {
  id: string;
  precio_cop: number;
  nombre?: string;
}

interface Producto {
  id: string;
  nombre: string;
  estado: string;
  variantes: Variante[];
  categoria: { nombre: string };
}

interface ProductosResponse {
  items: Producto[];
}

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'NEQUI' | 'DATAFONO';

const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  NEQUI: 'Nequi',
  TRANSFERENCIA: 'Transferencia',
  DATAFONO: 'Datáfono',
};

function formatCOP(v: number) {
  return `$ ${v.toLocaleString('es-CO')}`;
}

// ── Sub-componente: Panel de cobro ─────────────────────────────────────────

interface PanelCobroProps {
  comandaId: string;
  total: number;
  onCerrar: () => void;
  onCobrado: (cobroId: string) => void;
}

function PanelCobro({ comandaId, total, onCerrar, onCobrado }: PanelCobroProps) {
  const [pagos, setPagos] = useState<{ metodo: MetodoPago; monto: string }[]>([
    { metodo: 'EFECTIVO', monto: String(total) },
  ]);
  const [error, setError] = useState<string | null>(null);

  const procesarCobro = useMutation({
    mutationFn: () =>
      api.post<{ cobroId: string; cambio: number }>('/sales/cobros', {
        comandaId,
        pagos: pagos.map((p) => ({ metodo: p.metodo, monto: parseInt(p.monto, 10) || 0 })),
      }),
    onSuccess: (res) => onCobrado(res.cobroId),
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al procesar cobro'),
  });

  const totalPagado = pagos.reduce((s, p) => s + (parseInt(p.monto, 10) || 0), 0);
  const cambio = totalPagado - total;

  function agregarMetodo() {
    setPagos((prev) => [...prev, { metodo: 'EFECTIVO', monto: '0' }]);
  }

  function quitarMetodo(i: number) {
    setPagos((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Procesar cobro"
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Cobro</h2>
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-3xl font-bold text-brand-600 mt-1">{formatCOP(total)}</p>
        </div>

        <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
          {pagos.map((pago, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={pago.metodo}
                onChange={(e) =>
                  setPagos((prev) =>
                    prev.map((p, idx) =>
                      idx === i ? { ...p, metodo: e.target.value as MetodoPago } : p,
                    ),
                  )
                }
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                aria-label={`Método de pago ${i + 1}`}
              >
                {(Object.keys(METODO_LABEL) as MetodoPago[]).map((m) => (
                  <option key={m} value={m}>
                    {METODO_LABEL[m]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={pago.monto}
                onChange={(e) =>
                  setPagos((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, monto: e.target.value } : p)),
                  )
                }
                className="w-32 border rounded-lg px-3 py-2 text-sm text-right"
                aria-label={`Monto pago ${i + 1}`}
              />
              {pagos.length > 1 && (
                <button
                  onClick={() => quitarMetodo(i)}
                  aria-label="Quitar método"
                  className="text-red-400 hover:text-red-600 text-lg px-1"
                >
                  −
                </button>
              )}
            </div>
          ))}
          <button onClick={agregarMetodo} className="text-sm text-brand-600 hover:underline">
            + Agregar método de pago
          </button>
        </div>

        <div className="px-5 pb-2">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Total pagado</span>
            <span className="font-medium">{formatCOP(totalPagado)}</span>
          </div>
          {cambio >= 0 && pagos.some((p) => p.metodo === 'EFECTIVO') && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Cambio</span>
              <span className="font-medium text-emerald-600">{formatCOP(cambio)}</span>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="px-5 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="p-5 pt-2">
          <button
            onClick={() => {
              setError(null);
              procesarCobro.mutate();
            }}
            disabled={totalPagado < total || procesarCobro.isPending}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {procesarCobro.isPending ? 'Procesando...' : 'Procesar cobro'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: Factura post-cobro ─────────────────────────────────────

interface PanelFacturaProps {
  cobroId: string;
  onCerrar: () => void;
}

function PanelFactura({ cobroId, onCerrar }: PanelFacturaProps) {
  const [facturaId, setFacturaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  useEffect(() => {
    setEmitiendo(true);
    api
      .post<{ facturaId: string; numero: string }>('/sales/facturas', { cobroId })
      .then((r) => setFacturaId(r.facturaId))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al emitir factura'))
      .finally(() => setEmitiendo(false));
  }, [cobroId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Factura emitida"
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
        {emitiendo && <p className="text-gray-500 text-sm">Emitiendo factura...</p>}
        {!emitiendo && error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}
        {!emitiendo && !error && facturaId && (
          <>
            <div className="text-5xl mb-3" aria-hidden>
              ✓
            </div>
            <h2 className="text-lg font-bold text-gray-800">Cobro completado</h2>
            <p className="text-sm text-gray-500 mt-1">Factura emitida correctamente.</p>
            <button
              onClick={() => window.print()}
              className="mt-4 w-full py-2.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Imprimir factura
            </button>
          </>
        )}
        <button
          onClick={onCerrar}
          className="mt-3 w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
        >
          Ir a mesas
        </button>
      </div>
    </div>
  );
}

// ── Barra de progreso de estado de comanda ────────────────────────────────

const PASOS_COMANDA = [
  { estado: 'ABIERTA', label: 'Abierta' },
  { estado: 'ENVIADA', label: 'En cocina' },
  { estado: 'EN_PREPARACION', label: 'Preparando' },
  { estado: 'LISTA', label: 'Lista' },
  { estado: 'COBRADA', label: 'Cobrada' },
];

function BarraProgreso({ estadoActual }: { estadoActual: string }) {
  const idxActual = PASOS_COMANDA.findIndex((p) => p.estado === estadoActual);
  if (idxActual < 0) return null;
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {PASOS_COMANDA.map((paso, i) => {
        const activo = i === idxActual;
        const completado = i < idxActual;
        return (
          <div key={paso.estado} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                  completado
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : activo
                      ? 'bg-white border-brand-600 text-brand-600 font-bold'
                      : 'bg-white border-gray-200 text-gray-300'
                }`}
              >
                {completado ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs mt-0.5 whitespace-nowrap ${
                  activo
                    ? 'text-brand-700 font-semibold'
                    : completado
                      ? 'text-brand-500'
                      : 'text-gray-300'
                }`}
              >
                {paso.label}
              </span>
            </div>
            {i < PASOS_COMANDA.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 mb-4 flex-shrink-0 ${
                  i < idxActual ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal: Mesa ─────────────────────────────────────────────

export function Mesa() {
  const { mesaId } = useParams<{ mesaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('');
  const [cantidadesSelec, setCantidadesSelec] = useState<Record<string, number>>({});
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [panelCobro, setPanelCobro] = useState(false);
  const [cobroId, setCobroId] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [tab, setTab] = useState<'comanda' | 'productos'>('comanda');

  // ── Datos de la mesa ──────────────────────────────────────────────────────
  const mesaQ = useQuery<{ mesas: ResumenMesa[] }>({
    queryKey: ['mesas'],
    queryFn: () => api.get('/sales/mesas'),
  });

  const mesa = mesaQ.data?.mesas.find((m) => m.mesaId === mesaId);

  // Sincronizar comandaId desde la mesa cuando llega el dato
  useEffect(() => {
    if (mesa?.comandaActivaId && !comandaId) {
      setComandaId(mesa.comandaActivaId);
    }
  }, [mesa, comandaId]);

  // ── Datos de la comanda ───────────────────────────────────────────────────
  const comandaQ = useQuery<DetalleComanda>({
    queryKey: ['comanda', comandaId],
    queryFn: () => api.get(`/sales/comandas/${comandaId ?? ''}`),
    enabled: !!comandaId,
    refetchInterval: 10_000,
  });

  const comanda = comandaQ.data;

  // ── Productos disponibles ─────────────────────────────────────────────────
  const productosQ = useQuery<ProductosResponse>({
    queryKey: ['productos-pos', busqueda],
    queryFn: () =>
      api.get(
        `/catalog/productos?search=${encodeURIComponent(busqueda)}&limit=50&estado=publicado`,
      ),
  });

  // ── Mutaciones ────────────────────────────────────────────────────────────

  const crearComanda = useMutation({
    mutationFn: () =>
      api.post<{ comandaId: string; mesaId: string }>('/sales/comandas', { mesaId }),
    onSuccess: (res) => {
      setComandaId(res.comandaId);
      void queryClient.invalidateQueries({ queryKey: ['mesas'] });
    },
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error al crear comanda'),
  });

  const agregarLinea = useMutation({
    mutationFn: ({ varianteId, cantidad }: { varianteId: string; cantidad: number }) =>
      api.post(`/sales/comandas/${comandaId}/lineas`, { varianteId, cantidad }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comanda', comandaId] });
      setTab('comanda');
    },
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error al agregar producto'),
  });

  const cancelarLinea = useMutation({
    mutationFn: (lineaId: string) => api.delete(`/sales/comandas/${comandaId}/lineas/${lineaId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comanda', comandaId] }),
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error al quitar línea'),
  });

  const enviarComanda = useMutation({
    mutationFn: () => api.post(`/sales/comandas/${comandaId}/enviar`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comanda', comandaId] }),
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error al enviar comanda'),
  });

  const marcarPreparacion = useMutation({
    mutationFn: () => api.post(`/sales/comandas/${comandaId}/preparacion`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comanda', comandaId] }),
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error'),
  });

  const marcarLista = useMutation({
    mutationFn: () => api.post(`/sales/comandas/${comandaId}/lista`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comanda', comandaId] }),
    onError: (e) => setErrorAccion(e instanceof ApiError ? e.message : 'Error'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCobrado(id: string) {
    setPanelCobro(false);
    setCobroId(id);
  }

  function handleFacturaCerrada() {
    void queryClient.invalidateQueries({ queryKey: ['mesas'] });
    navigate('/mesas');
  }

  function handleAgregarProducto(variante: Variante, cantidad: number) {
    setErrorAccion(null);
    if (!comandaId) {
      crearComanda.mutate(undefined, {
        onSuccess: (res) => {
          setTimeout(() => {
            agregarLinea.mutate({ varianteId: variante.id, cantidad });
          }, 300);
          void res;
        },
      });
    } else {
      agregarLinea.mutate({ varianteId: variante.id, cantidad });
    }
  }

  function getCantidad(varianteId: string) {
    return cantidadesSelec[varianteId] ?? 1;
  }

  function setCantidad(varianteId: string, delta: number) {
    setCantidadesSelec((prev) => {
      const actual = prev[varianteId] ?? 1;
      const nuevo = Math.max(1, actual + delta);
      return { ...prev, [varianteId]: nuevo };
    });
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const estadoComanda = comanda?.estado ?? '';
  const puedeAgregar = !estadoComanda || estadoComanda === 'ABIERTA';
  const puedeEnviar = estadoComanda === 'ABIERTA' && (comanda?.lineas.length ?? 0) > 0;
  const puedePreparacion = estadoComanda === 'ENVIADA';
  const puedeLista = estadoComanda === 'EN_PREPARACION';
  const puedeCobrar = ['ABIERTA', 'ENVIADA', 'EN_PREPARACION', 'LISTA'].includes(estadoComanda);

  const todosProductos = (productosQ.data?.items ?? []).filter(
    (p) => p.estado === 'publicado' && p.variantes.length > 0,
  );

  const categorias = Array.from(
    new Set(todosProductos.map((p) => p.categoria?.nombre).filter(Boolean)),
  );

  const productosPublicados = categoriaActiva
    ? todosProductos.filter((p) => p.categoria?.nombre === categoriaActiva)
    : todosProductos;

  if (mesaQ.isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!mesa) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Mesa no encontrada.</p>
        <button
          onClick={() => navigate('/mesas')}
          className="mt-3 text-brand-600 hover:underline text-sm"
        >
          Volver a mesas
        </button>
      </div>
    );
  }

  // ── Layout principal ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Barra superior */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mesas')}
            aria-label="Volver a mesas"
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-800">Mesa {mesa.nombre}</h1>
          {errorAccion && (
            <p role="alert" className="ml-auto text-xs text-red-600 max-w-xs text-right">
              {errorAccion}
            </p>
          )}
        </div>
        {comanda && <BarraProgreso estadoActual={comanda.estado} />}
      </div>

      {/* Tabs en móvil */}
      <div className="flex lg:hidden border-b mb-4">
        {(['comanda', 'productos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500'
            }`}
          >
            {t === 'comanda' ? 'Comanda' : 'Agregar'}
          </button>
        ))}
      </div>

      {/* Layout split (tablet/desktop) y tabs (móvil) */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Panel izquierdo: Agregar productos */}
        <div
          className={`flex flex-col flex-1 min-w-0 ${tab === 'productos' ? '' : 'hidden'} lg:flex`}
        >
          {/* Búsqueda */}
          <div className="mb-2">
            <input
              type="search"
              aria-label="Buscar producto"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setCategoriaActiva('');
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filtro de categorías */}
          {categorias.length > 0 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoriaActiva('')}
                className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${
                  categoriaActiva === ''
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                Todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoriaActiva(cat ?? '');
                    setBusqueda('');
                  }}
                  className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${
                    categoriaActiva === cat
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {productosQ.isLoading && (
            <div className="animate-pulse grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {productosPublicados.length === 0 && !productosQ.isLoading && (
              <p className="text-center py-8 text-gray-400 text-sm">Sin productos disponibles.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {productosPublicados.map((p) => {
                const variante = p.variantes[0];
                if (!variante) return null;
                const cantidad = getCantidad(variante.id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col p-3 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all"
                  >
                    <span className="text-xs text-gray-400 truncate">{p.categoria?.nombre}</span>
                    <span className="text-sm font-semibold text-gray-800 leading-tight mt-0.5 line-clamp-2 flex-1">
                      {p.nombre}
                    </span>
                    <span className="text-sm font-bold text-brand-600 mt-1">
                      {formatCOP(variante.precio_cop)}
                    </span>

                    {/* Control cantidad + botón agregar */}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => setCantidad(variante.id, -1)}
                        disabled={cantidad <= 1}
                        className="w-7 h-7 rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-base leading-none"
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm font-semibold text-gray-700">
                        {cantidad}
                      </span>
                      <button
                        onClick={() => setCantidad(variante.id, 1)}
                        className="w-7 h-7 rounded-lg border text-gray-600 hover:bg-gray-100 text-base leading-none"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          setErrorAccion(null);
                          handleAgregarProducto(variante, cantidad);
                          setCantidadesSelec((prev) => ({ ...prev, [variante.id]: 1 }));
                        }}
                        disabled={!puedeAgregar || agregarLinea.isPending}
                        className="ml-1 px-2 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition-transform"
                        aria-label={`Agregar ${cantidad} ${p.nombre}`}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel derecho: Comanda */}
        <div
          className={`flex flex-col w-full lg:w-72 xl:w-80 flex-shrink-0 ${tab === 'comanda' ? '' : 'hidden'} lg:flex`}
        >
          {/* Sin comanda activa */}
          {!comandaId && !crearComanda.isPending && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-400">
              <p className="text-sm">Mesa libre. Agrega un producto para abrir comanda.</p>
              <button
                onClick={() => {
                  setErrorAccion(null);
                  crearComanda.mutate();
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
              >
                Abrir comanda
              </button>
            </div>
          )}

          {crearComanda.isPending && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm animate-pulse">
              Abriendo comanda...
            </div>
          )}

          {/* Lineas de comanda */}
          {comandaId && comanda && (
            <>
              <div className="flex-1 overflow-y-auto space-y-1.5 mb-3">
                {comanda.lineas.length === 0 && (
                  <p className="text-center py-8 text-gray-400 text-sm">
                    Comanda vacía. Agrega productos.
                  </p>
                )}
                {comanda.lineas.map((l) => (
                  <div
                    key={l.lineaId}
                    className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {l.nombreProducto}
                      </p>
                      <p className="text-xs text-gray-400">
                        {l.cantidad} × {formatCOP(l.precioUnitarioCOP)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {formatCOP(l.subtotalConIVA)}
                    </span>
                    {puedeAgregar && (
                      <button
                        onClick={() => {
                          setErrorAccion(null);
                          cancelarLinea.mutate(l.lineaId);
                        }}
                        disabled={cancelarLinea.isPending}
                        aria-label={`Quitar ${l.nombreProducto}`}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none px-1 disabled:opacity-50"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t pt-3 mb-3">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-brand-600 text-lg">{formatCOP(comanda.totalConIVA)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-2">
                {puedeEnviar && (
                  <button
                    onClick={() => {
                      setErrorAccion(null);
                      enviarComanda.mutate();
                    }}
                    disabled={enviarComanda.isPending}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {enviarComanda.isPending ? 'Enviando...' : 'Enviar a cocina'}
                  </button>
                )}
                {puedePreparacion && (
                  <button
                    onClick={() => {
                      setErrorAccion(null);
                      marcarPreparacion.mutate();
                    }}
                    disabled={marcarPreparacion.isPending}
                    className="w-full py-2.5 rounded-lg bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 disabled:opacity-50"
                  >
                    {marcarPreparacion.isPending ? '...' : 'Marcar en preparación'}
                  </button>
                )}
                {puedeLista && (
                  <button
                    onClick={() => {
                      setErrorAccion(null);
                      marcarLista.mutate();
                    }}
                    disabled={marcarLista.isPending}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {marcarLista.isPending ? '...' : 'Marcar lista'}
                  </button>
                )}
                {puedeCobrar && (
                  <button
                    onClick={() => {
                      setErrorAccion(null);
                      setPanelCobro(true);
                    }}
                    className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 active:scale-95 transition-transform"
                  >
                    Cobrar {formatCOP(comanda.totalConIVA)}
                  </button>
                )}
                {estadoComanda === 'COBRADA' && (
                  <div className="text-center py-3 text-emerald-600 font-medium text-sm">
                    Comanda cobrada
                  </div>
                )}
              </div>
            </>
          )}

          {comandaId && comandaQ.isLoading && (
            <div className="flex-1 animate-pulse space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 bg-gray-200 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB móvil para alternar tabs */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setTab((t) => (t === 'comanda' ? 'productos' : 'comanda'))}
          className="w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-brand-700 active:scale-95 transition-transform"
          aria-label={tab === 'comanda' ? 'Ver productos' : 'Ver comanda'}
        >
          {tab === 'comanda' ? '+' : '≡'}
        </button>
      </div>

      {/* Modal cobro */}
      {panelCobro && comandaId && comanda && (
        <PanelCobro
          comandaId={comandaId}
          total={comanda.totalConIVA}
          onCerrar={() => setPanelCobro(false)}
          onCobrado={handleCobrado}
        />
      )}

      {/* Modal factura */}
      {cobroId && <PanelFactura cobroId={cobroId} onCerrar={handleFacturaCerrada} />}
    </div>
  );
}
