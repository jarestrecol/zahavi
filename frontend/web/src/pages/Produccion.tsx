import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

interface Variante {
  id: string;
  nombre?: string;
  precio_cop: number;
  recetaId: string | null;
}

interface Producto {
  id: string;
  nombre: string;
  estado: string;
  variantes: Variante[];
}

interface ProductosResponse {
  items: Producto[];
}

interface UnidadDeNegocio {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
}

interface UnidadesResponse {
  items: UnidadDeNegocio[];
}

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

const ESTADOS = ['', 'PLANIFICADA', 'RESERVADA', 'EN_EJECUCION', 'EJECUTADA', 'CANCELADA'];

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  PLANIFICADA: { label: 'Planificada', className: 'bg-slate-100 text-slate-700' },
  RESERVADA: { label: 'Reservada', className: 'bg-amber-100 text-amber-800' },
  EN_EJECUCION: { label: 'En produccion', className: 'bg-sky-100 text-sky-800' },
  EJECUTADA: { label: 'Terminada', className: 'bg-emerald-100 text-emerald-800' },
  CANCELADA: { label: 'Cancelada', className: 'bg-rose-100 text-rose-700' },
};

function estadoLabel(estado: string) {
  return ESTADO_LABEL[estado] ?? { label: estado, className: 'bg-slate-100 text-slate-700' };
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compactId(id: string) {
  return id.slice(0, 8);
}

function ErrorText({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{value}</p>
  );
}

export default function Produccion() {
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalNuevaOrden, setModalNuevaOrden] = useState(false);
  const [ordenActiva, setOrdenActiva] = useState<ResumenOrden | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const ordenesQ = useQuery<OrdenesResponse>({
    queryKey: ['ordenes-produccion', filtroEstado],
    queryFn: () =>
      api.get<OrdenesResponse>(
        `/production/orders${filtroEstado ? `?estado=${encodeURIComponent(filtroEstado)}` : ''}`,
      ),
    refetchInterval: 30_000,
  });

  const ordenes = ordenesQ.data?.ordenes ?? [];
  const resumen = useMemo(
    () => ({
      planeadas: ordenes.filter((o) => o.estado === 'PLANIFICADA').length,
      enProceso: ordenes.filter((o) => o.estado === 'RESERVADA' || o.estado === 'EN_EJECUCION')
        .length,
      terminadas: ordenes.filter((o) => o.estado === 'EJECUTADA').length,
      unidades: ordenes.reduce((sum, o) => sum + (o.lote?.cantidadProducida ?? 0), 0),
    }),
    [ordenes],
  );

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['ordenes-produccion'] });
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_460px] lg:items-end">
          <div>
            <p className="section-title">Planta central</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Produccion diaria
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Crea ordenes desde productos con receta, reserva inventario, cierra lotes y prepara
              despachos a puntos de venta.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Planificadas" value={resumen.planeadas} tone="slate" />
            <Kpi label="En curso" value={resumen.enProceso} tone="sky" />
            <Kpi label="Terminadas" value={resumen.terminadas} tone="emerald" />
            <Kpi label="Unidades" value={resumen.unidades} tone="amber" />
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ESTADOS.map((estado) => (
              <button
                key={estado || 'TODAS'}
                onClick={() => setFiltroEstado(estado)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${
                  filtroEstado === estado
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {estado ? estadoLabel(estado).label : 'Todas'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setModalNuevaOrden(true)}>
            Nueva orden
          </button>
        </div>
      </section>

      <ErrorText value={errorGlobal} />

      {ordenesQ.isLoading && (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {ordenesQ.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          No se pudieron cargar las ordenes de produccion.
        </div>
      )}

      {!ordenesQ.isLoading && !ordenesQ.isError && ordenes.length === 0 && (
        <div className="surface p-10 text-center">
          <p className="text-lg font-black text-slate-800">No hay ordenes en este estado</p>
          <p className="mt-1 text-sm text-slate-500">Crea una orden para comenzar produccion.</p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {ordenes.map((orden) => (
          <OrdenCard
            key={orden.ordenId}
            orden={orden}
            onActualizar={invalidar}
            onError={setErrorGlobal}
            onDespacho={() => setOrdenActiva(orden)}
          />
        ))}
      </div>

      {modalNuevaOrden && <ModalNuevaOrden onCerrar={() => setModalNuevaOrden(false)} />}
      {ordenActiva && (
        <PanelDespacho
          orden={ordenActiva}
          onCerrar={() => setOrdenActiva(null)}
          onActualizar={invalidar}
          onError={setErrorGlobal}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  const classes: Record<string, string> = {
    slate: 'bg-slate-950 text-white',
    sky: 'bg-sky-50 text-sky-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
  };
  return (
    <div className={`rounded-lg p-3 ${classes[tone] ?? classes.slate}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function ModalNuevaOrden({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [varianteId, setVarianteId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState<string | null>(null);

  const productosQ = useQuery<ProductosResponse>({
    queryKey: ['productos-produccion'],
    queryFn: () => api.get<ProductosResponse>('/catalog/productos?limit=200'),
  });

  const variantes = (productosQ.data?.items ?? [])
    .filter((p) => p.estado === 'publicado' || p.estado === 'activo')
    .flatMap((p) => p.variantes.map((v) => ({ ...v, nombreProducto: p.nombre })));
  const variantesConReceta = variantes.filter((v) => Boolean(v.recetaId));
  const variante = variantesConReceta.find((v) => v.id === varianteId);

  const crear = useMutation({
    mutationFn: (data: { varianteId: string; recetaId: string; cantidadAProducir: number }) =>
      api.post('/production/orders', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ordenes-produccion'] });
      onCerrar();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo crear la orden'),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cantidadAProducir = Number(cantidad);
    if (!variante?.recetaId || !Number.isInteger(cantidadAProducir) || cantidadAProducir < 1) {
      setError('Selecciona un producto con receta y una cantidad valida');
      return;
    }
    setError(null);
    crear.mutate({ varianteId: variante.id, recetaId: variante.recetaId, cantidadAProducir });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <form onSubmit={submit} className="surface w-full max-w-md p-5">
        <h2 className="text-lg font-black text-slate-950">Nueva orden de produccion</h2>
        <div className="mt-4 space-y-3">
          <select
            className="field"
            value={varianteId}
            onChange={(e) => setVarianteId(e.target.value)}
          >
            <option value="">Producto con receta</option>
            {variantesConReceta.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombreProducto}
                {v.nombre ? ` - ${v.nombre}` : ''}
              </option>
            ))}
          </select>
          {!productosQ.isLoading && variantesConReceta.length === 0 && (
            <p className="text-sm font-semibold text-amber-700">
              No hay productos con receta vinculada. Crea recetas desde Catalogo antes de producir.
            </p>
          )}
          <input
            className="field"
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Cantidad a producir"
          />
        </div>
        <ErrorText value={error} />
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primary flex-1" disabled={crear.isPending}>
            {crear.isPending ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrdenCard({
  orden,
  onActualizar,
  onError,
  onDespacho,
}: {
  orden: ResumenOrden;
  onActualizar: () => void;
  onError: (error: string | null) => void;
  onDespacho: () => void;
}) {
  const [lote, setLote] = useState('');
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const estado = estadoLabel(orden.estado);

  const calcularBOM = useOrdenMutation(
    `/production/orders/${orden.ordenId}/bom`,
    onActualizar,
    onError,
  );
  const iniciar = useOrdenMutation(
    `/production/orders/${orden.ordenId}/iniciar`,
    onActualizar,
    onError,
  );
  const ejecutar = useMutation({
    mutationFn: () =>
      api.post(`/production/orders/${orden.ordenId}/ejecutar`, {
        codigoLote: lote.trim(),
        cantidadProducida: Number(cantidadProducida),
      }),
    onSuccess: () => {
      setLote('');
      setCantidadProducida('');
      onActualizar();
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'No se pudo cerrar produccion'),
  });
  const cancelar = useMutation({
    mutationFn: () =>
      api.delete(`/production/orders/${orden.ordenId}`, { motivo: motivoCancelacion }),
    onSuccess: () => {
      setMotivoCancelacion('');
      onActualizar();
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'No se pudo cancelar'),
  });

  return (
    <article className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Orden {compactId(orden.ordenId)}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {orden.lote ? `Lote ${orden.lote.codigo}` : `${orden.cantidadAProducir} unidades`}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Creada {formatFecha(orden.creadaEn)}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${estado.className}`}>
          {estado.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Plan</p>
          <p className="text-lg font-black text-slate-900">{orden.cantidadAProducir}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Producido</p>
          <p className="text-lg font-black text-slate-900">{orden.lote?.cantidadProducida ?? 0}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {orden.estado === 'PLANIFICADA' && (
          <button className="btn-secondary" onClick={() => calcularBOM.mutate({ confirmar: true })}>
            Reservar insumos
          </button>
        )}
        {orden.estado === 'RESERVADA' && (
          <button className="btn-primary" onClick={() => iniciar.mutate({ confirmar: true })}>
            Iniciar
          </button>
        )}
        {orden.estado === 'EJECUTADA' && (
          <button className="btn-primary" onClick={onDespacho}>
            Preparar despacho
          </button>
        )}
      </div>

      {orden.estado === 'EN_EJECUCION' && (
        <div className="mt-4 grid gap-2 rounded-lg bg-emerald-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="field"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Codigo de lote"
          />
          <input
            className="field"
            type="number"
            min={1}
            value={cantidadProducida}
            onChange={(e) => setCantidadProducida(e.target.value)}
            placeholder="Cantidad final"
          />
          <button
            className="btn-primary"
            disabled={ejecutar.isPending || !lote.trim() || Number(cantidadProducida) < 1}
            onClick={() => ejecutar.mutate()}
          >
            Cerrar lote
          </button>
        </div>
      )}

      {orden.estado !== 'EJECUTADA' && orden.estado !== 'CANCELADA' && (
        <div className="mt-3 flex gap-2">
          <input
            className="field"
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
            placeholder="Motivo para cancelar"
          />
          <button
            className="btn-danger"
            disabled={cancelar.isPending || !motivoCancelacion.trim()}
            onClick={() => cancelar.mutate()}
          >
            Cancelar
          </button>
        </div>
      )}
    </article>
  );
}

function useOrdenMutation(
  path: string,
  onActualizar: () => void,
  onError: (error: string | null) => void,
) {
  return useMutation({
    mutationFn: (body: unknown) => api.post(path, body),
    onSuccess: () => {
      onActualizar();
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'No se pudo completar la accion'),
  });
}

function PanelDespacho({
  orden,
  onCerrar,
  onActualizar,
  onError,
}: {
  orden: ResumenOrden;
  onCerrar: () => void;
  onActualizar: () => void;
  onError: (error: string | null) => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const unidadesQ = useQuery<UnidadesResponse>({
    queryKey: ['unidades-negocio'],
    queryFn: () => api.get<UnidadesResponse>('/identity/unidades-de-negocio'),
  });
  const destinos = (unidadesQ.data?.items ?? []).filter((u) => u.estado === 'activo');
  const preparar = useMutation({
    mutationFn: () =>
      api.post('/production/dispatches', {
        ordenId: orden.ordenId,
        cantidadDespachada: Number(cantidad),
        puntoDeVentaDestinoId: destinoId,
      }),
    onSuccess: () => {
      onActualizar();
      onCerrar();
      onError(null);
    },
    onError: (e) => onError(e instanceof ApiError ? e.message : 'No se pudo preparar despacho'),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="surface w-full max-w-md p-5">
        <h2 className="text-lg font-black text-slate-950">Preparar despacho</h2>
        <p className="mt-1 text-sm text-slate-500">Lote {orden.lote?.codigo}</p>
        <div className="mt-4 space-y-3">
          <input
            className="field"
            type="number"
            min={1}
            max={orden.lote?.cantidadProducida ?? undefined}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder={`Cantidad max ${orden.lote?.cantidadProducida ?? '?'}`}
          />
          <select
            className="field"
            value={destinoId}
            onChange={(e) => setDestinoId(e.target.value)}
          >
            <option value="">Punto de venta destino</option>
            {destinos.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} - {u.tipo}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="btn-primary flex-1"
            disabled={preparar.isPending || !destinoId || Number(cantidad) < 1}
            onClick={() => preparar.mutate()}
          >
            Preparar
          </button>
        </div>
      </div>
    </div>
  );
}
