import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

interface Product {
  id: string;
  nombre: string;
  categoria: { id: string; nombre: string } | null;
  variantes: Array<{ id: string; nombre: string; precio_cop: number; recetaId: string | null }>;
  estado: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
}

function formatCOP(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`;
}

function uniqueCategories(products: Product[]) {
  const map = new Map<string, { id: string; nombre: string }>();
  for (const product of products) {
    if (product.categoria) map.set(product.categoria.id, product.categoria);
  }
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function ProductStatus({ estado }: { estado: string }) {
  const activo = estado === 'publicado' || estado === 'activo';
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {activo ? 'Publicado' : 'No publicado'}
    </span>
  );
}

export function Products() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [modal, setModal] = useState<'categoria' | 'producto' | null>(null);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [productoForm, setProductoForm] = useState({
    nombre: '',
    categoriaId: '',
    varianteNombre: 'Unidad',
    precioCop: '',
  });

  useEffect(() => {
    const id = window.setTimeout(() => setBusquedaDebounced(busqueda), 250);
    return () => window.clearTimeout(id);
  }, [busqueda]);

  const productosQ = useQuery<ProductsResponse>({
    queryKey: ['products', busquedaDebounced],
    queryFn: () =>
      api.get<ProductsResponse>(
        `/catalog/productos?search=${encodeURIComponent(busquedaDebounced)}&limit=200`,
      ),
  });

  const productos = productosQ.data?.items ?? [];
  const categorias = useMemo(() => uniqueCategories(productos), [productos]);
  const publicados = productos.filter((p) => p.estado === 'publicado' || p.estado === 'activo');
  const conReceta = productos.filter((p) => p.variantes.some((v) => v.recetaId));
  const productosFiltrados = categoriaFiltro
    ? productos.filter((p) => p.categoria?.id === categoriaFiltro)
    : productos;

  const crearCategoria = useMutation({
    mutationFn: (nombre: string) =>
      api.post<{ categoriaId: string }>('/catalog/categorias', {
        nombre,
        padreId: null,
        orden: categorias.length,
      }),
    onSuccess: () => {
      setCategoriaNombre('');
      setModal(null);
      setErrorFormulario(null);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) =>
      setErrorFormulario(e instanceof ApiError ? e.message : 'No se pudo crear la categoria'),
  });

  const crearProducto = useMutation({
    mutationFn: (input: typeof productoForm) =>
      api.post<{ productoId: string }>('/catalog/productos', {
        nombre: input.nombre.trim(),
        categoriaId: input.categoriaId,
        imagenUrl: null,
        varianteInicial: {
          nombre: input.varianteNombre.trim() || 'Unidad',
          precioCop: Number(input.precioCop),
        },
      }),
    onSuccess: () => {
      setProductoForm({ nombre: '', categoriaId: '', varianteNombre: 'Unidad', precioCop: '' });
      setModal(null);
      setErrorFormulario(null);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) =>
      setErrorFormulario(e instanceof ApiError ? e.message : 'No se pudo crear el producto'),
  });

  function submitCategoria(event: React.FormEvent) {
    event.preventDefault();
    if (!categoriaNombre.trim()) {
      setErrorFormulario('Escribe el nombre de la categoria');
      return;
    }
    crearCategoria.mutate(categoriaNombre.trim());
  }

  function submitProducto(event: React.FormEvent) {
    event.preventDefault();
    if (
      !productoForm.nombre.trim() ||
      !productoForm.categoriaId ||
      Number(productoForm.precioCop) < 0
    ) {
      setErrorFormulario('Completa nombre, categoria y precio');
      return;
    }
    crearProducto.mutate(productoForm);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="surface overflow-hidden">
        <div className="grid gap-4 p-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="section-title">Catalogo</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Productos y menu operativo
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Gestiona lo que se vende en caja y lo que puede entrar a produccion cuando tiene
              receta conectada.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-950 p-3 text-white">
              <p className="text-xs text-slate-300">Productos</p>
              <p className="text-2xl font-black">{productos.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
              <p className="text-xs text-emerald-700">Publicados</p>
              <p className="text-2xl font-black">{publicados.length}</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3 text-sky-800">
              <p className="text-xs text-sky-700">Con receta</p>
              <p className="text-2xl font-black">{conReceta.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input
              type="search"
              aria-label="Buscar productos"
              placeholder="Buscar por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="field sm:max-w-xs"
            />
            <select
              aria-label="Filtrar por categoria"
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="field sm:max-w-xs"
            >
              <option value="">Todas las categorias</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setModal('categoria')}>
              Nueva categoria
            </button>
            <button className="btn-primary" onClick={() => setModal('producto')}>
              Nuevo producto
            </button>
          </div>
        </div>
      </section>

      {productosQ.isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {productosQ.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          No se pudo cargar el catalogo. Revisa la conexion con la API.
        </div>
      )}

      {!productosQ.isLoading && !productosQ.isError && productosFiltrados.length === 0 && (
        <div className="surface p-10 text-center">
          <p className="text-lg font-bold text-slate-700">No hay productos para mostrar</p>
          <p className="mt-1 text-sm text-slate-500">
            Crea una categoria y luego registra el primer producto.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {productosFiltrados.map((producto) => {
          const variante = producto.variantes[0];
          return (
            <article key={producto.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    {producto.categoria?.nombre ?? 'Sin categoria'}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-lg font-black text-slate-950">
                    {producto.nombre}
                  </h2>
                </div>
                <ProductStatus estado={producto.estado} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Precio venta</p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {variante ? formatCOP(variante.precio_cop) : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Produccion</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {producto.variantes.some((v) => v.recetaId) ? 'Receta lista' : 'Sin receta'}
                  </p>
                </div>
              </div>
            </article>
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
          <div className="surface w-full max-w-md p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">
                {modal === 'categoria' ? 'Nueva categoria' : 'Nuevo producto'}
              </h2>
              <button className="btn-secondary px-3 py-1.5" onClick={() => setModal(null)}>
                Cerrar
              </button>
            </div>

            {modal === 'categoria' ? (
              <form onSubmit={submitCategoria} className="space-y-3">
                <input
                  className="field"
                  value={categoriaNombre}
                  onChange={(e) => setCategoriaNombre(e.target.value)}
                  placeholder="Ej: Panaderia salada"
                  autoFocus
                />
                {errorFormulario && (
                  <p className="text-sm font-semibold text-rose-600">{errorFormulario}</p>
                )}
                <button className="btn-primary w-full" disabled={crearCategoria.isPending}>
                  {crearCategoria.isPending ? 'Creando...' : 'Crear categoria'}
                </button>
              </form>
            ) : (
              <form onSubmit={submitProducto} className="space-y-3">
                <input
                  className="field"
                  value={productoForm.nombre}
                  onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  autoFocus
                />
                <select
                  className="field"
                  value={productoForm.categoriaId}
                  onChange={(e) =>
                    setProductoForm({ ...productoForm, categoriaId: e.target.value })
                  }
                >
                  <option value="">Selecciona categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  value={productoForm.varianteNombre}
                  onChange={(e) =>
                    setProductoForm({ ...productoForm, varianteNombre: e.target.value })
                  }
                  placeholder="Variante inicial"
                />
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={productoForm.precioCop}
                  onChange={(e) => setProductoForm({ ...productoForm, precioCop: e.target.value })}
                  placeholder="Precio en COP"
                />
                {errorFormulario && (
                  <p className="text-sm font-semibold text-rose-600">{errorFormulario}</p>
                )}
                <button className="btn-primary w-full" disabled={crearProducto.isPending}>
                  {crearProducto.isPending ? 'Creando...' : 'Crear producto'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
