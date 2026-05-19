import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

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

function formatCOP(v: number) {
  return `$ ${v.toLocaleString('es-CO')}`;
}

interface MesasResponse {
  mesas: Mesa[];
}

const ESTADO_CONFIG: Record<
  EstadoMesa,
  { label: string; bg: string; texto: string; punto: string }
> = {
  LIBRE: {
    label: 'Libre',
    bg: 'bg-emerald-50 border-emerald-200',
    texto: 'text-emerald-700',
    punto: 'bg-emerald-400',
  },
  OCUPADA: {
    label: 'Ocupada',
    bg: 'bg-amber-50 border-amber-200',
    texto: 'text-amber-700',
    punto: 'bg-amber-400',
  },
  EN_COBRO: {
    label: 'En cobro',
    bg: 'bg-blue-50 border-blue-200',
    texto: 'text-blue-700',
    punto: 'bg-blue-400',
  },
  RESERVADA: {
    label: 'Reservada',
    bg: 'bg-gray-50 border-gray-200',
    texto: 'text-gray-500',
    punto: 'bg-gray-300',
  },
};

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse h-28 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}

export function Mesas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalAdHoc, setModalAdHoc] = useState(false);
  const [nombreAdHoc, setNombreAdHoc] = useState('');
  const [errorAdHoc, setErrorAdHoc] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<MesasResponse>({
    queryKey: ['mesas'],
    queryFn: () => api.get<MesasResponse>('/sales/mesas'),
    refetchInterval: 15_000,
  });

  const abrirAdHoc = useMutation({
    mutationFn: (nombre: string) =>
      api.post<{ mesaId: string; comandaId: string }>('/sales/mesas/adhoc', { nombre }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['mesas'] });
      setModalAdHoc(false);
      setNombreAdHoc('');
      navigate(`/mesas/${res.mesaId}`);
    },
    onError: (e) => {
      setErrorAdHoc(e instanceof ApiError ? e.message : 'Error al abrir mesa');
    },
  });

  function handleTapMesa(mesa: Mesa) {
    if (mesa.estado === 'RESERVADA') return;
    navigate(`/mesas/${mesa.mesaId}`);
  }

  function handleAbrirAdHoc(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreAdHoc.trim()) return;
    setErrorAdHoc(null);
    abrirAdHoc.mutate(nombreAdHoc.trim());
  }

  const mesas = data?.mesas ?? [];
  const libres = mesas.filter((m) => m.estado === 'LIBRE').length;
  const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;
  const enCobro = mesas.filter((m) => m.estado === 'EN_COBRO').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mesas</h1>
          {!isLoading && !isError && (
            <p className="text-sm text-gray-500 mt-0.5">
              {libres} libres · {ocupadas} ocupadas · {enCobro} en cobro
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setModalAdHoc(true);
            setErrorAdHoc(null);
          }}
          className="bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 active:scale-95 transition-transform"
          aria-label="Abrir mesa adicional"
        >
          + Mesa adicional
        </button>
      </div>

      {/* Grid de mesas */}
      {isLoading && <SkeletonGrid />}

      {isError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
        >
          No se pudieron cargar las mesas. Verifica la conexión con la API.
        </div>
      )}

      {!isLoading && !isError && mesas.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No hay mesas configuradas.</p>
          <p className="text-sm mt-1">Un administrador debe crear las mesas del local.</p>
        </div>
      )}

      {!isLoading && !isError && mesas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {mesas.map((mesa) => {
            const cfg = ESTADO_CONFIG[mesa.estado] ?? ESTADO_CONFIG.LIBRE;
            const interactiva = mesa.estado !== 'RESERVADA';
            return (
              <button
                key={mesa.mesaId}
                onClick={() => handleTapMesa(mesa)}
                disabled={!interactiva}
                className={`
                  relative flex flex-col items-center justify-center
                  h-28 rounded-xl border-2 font-medium
                  transition-all duration-150
                  ${cfg.bg} ${cfg.texto}
                  ${interactiva ? 'cursor-pointer hover:shadow-md active:scale-95' : 'cursor-not-allowed opacity-60'}
                `}
                aria-label={`Mesa ${mesa.nombre}, estado: ${cfg.label}${mesa.resumenComanda ? `, total: ${formatCOP(mesa.resumenComanda.totalConIVA)}` : ''}`}
              >
                <span
                  className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${cfg.punto}`}
                  aria-hidden
                />
                <span className="text-2xl font-bold">{mesa.nombre}</span>
                <span className="text-xs mt-1 font-normal opacity-75">{cfg.label}</span>
                {mesa.tipo === 'AD_HOC' && (
                  <span className="text-xs opacity-50 mt-0.5">ad-hoc</span>
                )}
                {mesa.resumenComanda && mesa.resumenComanda.numLineas > 0 && (
                  <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center">
                    <span className="text-xs font-bold opacity-90">
                      {formatCOP(mesa.resumenComanda.totalConIVA)}
                    </span>
                    <span className="text-xs opacity-60">
                      {mesa.resumenComanda.numLineas} ítem
                      {mesa.resumenComanda.numLineas !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal mesa ad-hoc */}
      {modalAdHoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Abrir mesa adicional"
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalAdHoc(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Mesa adicional</h2>
            <form onSubmit={handleAbrirAdHoc} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="nombre-adhoc"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre de la mesa
                </label>
                <input
                  id="nombre-adhoc"
                  type="text"
                  value={nombreAdHoc}
                  onChange={(e) => setNombreAdHoc(e.target.value)}
                  placeholder="Ej: Terraza 1, Barra..."
                  maxLength={100}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              {errorAdHoc && (
                <p role="alert" className="text-sm text-red-600">
                  {errorAdHoc}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAdHoc(false)}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreAdHoc.trim() || abrirAdHoc.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {abrirAdHoc.isPending ? 'Abriendo...' : 'Abrir mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
