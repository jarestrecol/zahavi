import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.js';

type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'EN_COBRO';

interface ResumenComandaActiva {
  totalConIVA: number;
  numLineas: number;
}

interface Mesa {
  mesaId: string;
  nombre: string;
  tipo: string;
  estado: EstadoMesa;
  comandaActivaId: string | null;
  resumenComanda: ResumenComandaActiva | null;
}

interface MesasResponse {
  mesas: Mesa[];
}

const ESTADOS: Array<{ value: '' | EstadoMesa; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'LIBRE', label: 'Libres' },
  { value: 'OCUPADA', label: 'Ocupadas' },
  { value: 'EN_COBRO', label: 'En cobro' },
  { value: 'RESERVADA', label: 'Reservadas' },
];

const ESTADO_STYLE: Record<EstadoMesa, { label: string; card: string; dot: string; text: string }> =
  {
    LIBRE: {
      label: 'Libre',
      card: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
      text: 'text-emerald-800',
    },
    OCUPADA: {
      label: 'Ocupada',
      card: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
      dot: 'bg-amber-500',
      text: 'text-amber-800',
    },
    EN_COBRO: {
      label: 'En cobro',
      card: 'border-sky-200 bg-sky-50 hover:bg-sky-100',
      dot: 'bg-sky-500',
      text: 'text-sky-800',
    },
    RESERVADA: {
      label: 'Reservada',
      card: 'border-slate-200 bg-slate-50',
      dot: 'bg-slate-400',
      text: 'text-slate-600',
    },
  };

function formatCOP(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`;
}

function countByEstado(mesas: Mesa[], estado: EstadoMesa) {
  return mesas.filter((mesa) => mesa.estado === estado).length;
}

export function Mesas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { rol } = useAuthStore();
  const [estadoFiltro, setEstadoFiltro] = useState<'' | EstadoMesa>('');
  const [modal, setModal] = useState<'adhoc' | 'configurar' | null>(null);
  const [nombreMesa, setNombreMesa] = useState('');
  const [errorMesa, setErrorMesa] = useState<string | null>(null);

  const mesasQ = useQuery<MesasResponse>({
    queryKey: ['mesas', estadoFiltro],
    queryFn: () =>
      api.get<MesasResponse>(`/sales/mesas${estadoFiltro ? `?estado=${estadoFiltro}` : ''}`),
    refetchInterval: 15_000,
  });

  const abrirAdHoc = useMutation({
    mutationFn: (nombre: string) =>
      api.post<{ mesaId: string; comandaId: string }>('/sales/mesas/adhoc', { nombre }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['mesas'] });
      setModal(null);
      setNombreMesa('');
      navigate(`/mesas/${res.mesaId}`);
    },
    onError: (e) => setErrorMesa(e instanceof ApiError ? e.message : 'No se pudo abrir la mesa'),
  });

  const configurarMesa = useMutation({
    mutationFn: (nombre: string) => api.post<{ mesaId: string }>('/sales/mesas', { nombre }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mesas'] });
      setModal(null);
      setNombreMesa('');
      setErrorMesa(null);
    },
    onError: (e) => setErrorMesa(e instanceof ApiError ? e.message : 'No se pudo crear la mesa'),
  });

  const mesas = mesasQ.data?.mesas ?? [];
  const totalActivo = useMemo(
    () => mesas.reduce((sum, mesa) => sum + (mesa.resumenComanda?.totalConIVA ?? 0), 0),
    [mesas],
  );
  const puedeConfigurar = rol === 'ADMIN' || rol === 'SUPERADMIN';

  function submitMesa(event: React.FormEvent) {
    event.preventDefault();
    if (!nombreMesa.trim()) {
      setErrorMesa('Escribe un nombre de mesa');
      return;
    }
    setErrorMesa(null);
    if (modal === 'adhoc') abrirAdHoc.mutate(nombreMesa.trim());
    if (modal === 'configurar') configurarMesa.mutate(nombreMesa.trim());
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="section-title">Salon y caja</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Control vivo de mesas
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Abre comandas, toma pedidos y pasa a cobro desde una pantalla pensada para tablet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
              <p className="text-xs font-semibold">Libres</p>
              <p className="text-2xl font-black">{countByEstado(mesas, 'LIBRE')}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
              <p className="text-xs font-semibold">Ocupadas</p>
              <p className="text-2xl font-black">{countByEstado(mesas, 'OCUPADA')}</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3 text-sky-800">
              <p className="text-xs font-semibold">Cobro</p>
              <p className="text-2xl font-black">{countByEstado(mesas, 'EN_COBRO')}</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-3 text-white">
              <p className="text-xs font-semibold text-slate-300">Activo</p>
              <p className="text-lg font-black">{formatCOP(totalActivo)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ESTADOS.map((estado) => (
              <button
                key={estado.value || 'todas'}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${
                  estadoFiltro === estado.value
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setEstadoFiltro(estado.value)}
              >
                {estado.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {puedeConfigurar && (
              <button className="btn-secondary" onClick={() => setModal('configurar')}>
                Crear mesa fija
              </button>
            )}
            <button className="btn-primary" onClick={() => setModal('adhoc')}>
              Mesa rapida
            </button>
          </div>
        </div>
      </section>

      {mesasQ.isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {mesasQ.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          No se pudieron cargar las mesas. Revisa la conexion con la API.
        </div>
      )}

      {!mesasQ.isLoading && !mesasQ.isError && mesas.length === 0 && (
        <div className="surface p-10 text-center">
          <p className="text-lg font-black text-slate-800">No hay mesas en este filtro</p>
          <p className="mt-1 text-sm text-slate-500">Crea mesas fijas o abre una mesa rapida.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {mesas.map((mesa) => {
          const cfg = ESTADO_STYLE[mesa.estado];
          const interactiva = mesa.estado !== 'RESERVADA';
          return (
            <button
              key={mesa.mesaId}
              disabled={!interactiva}
              onClick={() => navigate(`/mesas/${mesa.mesaId}`)}
              className={`min-h-40 rounded-lg border p-4 text-left transition ${cfg.card} ${
                interactiva ? 'active:scale-[0.98]' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    {mesa.tipo === 'AD_HOC' ? 'Rapida' : 'Mesa'}
                  </p>
                  <h2 className={`mt-1 text-3xl font-black ${cfg.text}`}>{mesa.nombre}</h2>
                </div>
                <span className={`mt-1 h-3 w-3 rounded-full ${cfg.dot}`} />
              </div>
              <p className={`mt-4 text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
              {mesa.resumenComanda && mesa.resumenComanda.numLineas > 0 ? (
                <div className="mt-3 rounded-lg bg-white/75 p-3">
                  <p className="text-xl font-black text-slate-950">
                    {formatCOP(mesa.resumenComanda.totalConIVA)}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {mesa.resumenComanda.numLineas} item
                    {mesa.resumenComanda.numLineas !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-slate-500">Sin comanda activa</p>
              )}
            </button>
          );
        })}
      </div>

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <form onSubmit={submitMesa} className="surface w-full max-w-sm p-5">
            <h2 className="text-lg font-black text-slate-950">
              {modal === 'adhoc' ? 'Abrir mesa rapida' : 'Crear mesa fija'}
            </h2>
            <input
              className="field mt-4"
              value={nombreMesa}
              onChange={(e) => setNombreMesa(e.target.value)}
              placeholder={modal === 'adhoc' ? 'Ej: Terraza 1' : 'Ej: Mesa 12'}
              autoFocus
            />
            {errorMesa && <p className="mt-3 text-sm font-semibold text-rose-600">{errorMesa}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                disabled={abrirAdHoc.isPending || configurarMesa.isPending}
              >
                {abrirAdHoc.isPending || configurarMesa.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
