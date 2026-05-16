import {
  CrearProducto,
  ActivarProducto,
  ArchivarProducto,
  CrearCategoria,
  ArchivarCategoria,
  CrearReceta,
  CalcularEscandallo,
  CrearCombo,
} from '@zahavi/application';
import type { CatalogAdapters } from '@zahavi/adapter-persistence-supabase';

export interface ProductoListItem {
  id: string;
  nombre: string;
  estado: string;
  categoria: { id: string; nombre: string } | null;
  variantes: Array<{ id: string; nombre: string; precio_cop: number }>;
}

export interface CatalogComposition {
  crearProducto: CrearProducto;
  activarProducto: ActivarProducto;
  archivarProducto: ArchivarProducto;
  crearCategoria: CrearCategoria;
  archivarCategoria: ArchivarCategoria;
  crearReceta: CrearReceta;
  calcularEscandallo: CalcularEscandallo;
  crearCombo: CrearCombo;
  consultarProductos: (params: { search: string; limit: number }) => Promise<ProductoListItem[]>;
}

export function createCatalogComposition(adapters: CatalogAdapters): CatalogComposition {
  const {
    repositorioDeCategorias,
    repositorioDeProductos,
    repositorioDeRecetas,
    repositorioDeCombos,
    consultorDeCostos,
    publicadorDeEventos,
    db,
  } = adapters;

  return {
    crearProducto: new CrearProducto(
      repositorioDeProductos,
      repositorioDeCategorias,
      publicadorDeEventos,
    ),
    activarProducto: new ActivarProducto(repositorioDeProductos, publicadorDeEventos),
    archivarProducto: new ArchivarProducto(repositorioDeProductos, publicadorDeEventos),
    crearCategoria: new CrearCategoria(repositorioDeCategorias, publicadorDeEventos),
    archivarCategoria: new ArchivarCategoria(repositorioDeCategorias, publicadorDeEventos),
    crearReceta: new CrearReceta(repositorioDeProductos, repositorioDeRecetas, publicadorDeEventos),
    calcularEscandallo: new CalcularEscandallo(
      repositorioDeProductos,
      repositorioDeRecetas,
      consultorDeCostos,
    ),
    crearCombo: new CrearCombo(repositorioDeCombos, publicadorDeEventos),
    consultarProductos: async ({ search, limit }) => {
      const rows = await db
        .selectFrom('catalog.products as p')
        .leftJoin('catalog.categories as c', 'c.id', 'p.categoria_id')
        .leftJoin('catalog.product_variants as v', 'v.product_id', 'p.id')
        .select([
          'p.id',
          'p.nombre',
          'p.estado',
          'c.id as cat_id',
          'c.nombre as cat_nombre',
          'v.id as var_id',
          'v.nombre as var_nombre',
          'v.precio_cop',
        ])
        .where('p.nombre', 'ilike', `%${search}%`)
        .orderBy('p.nombre')
        .limit(limit * 20)
        .execute();

      // Agrupar variantes por producto
      const map = new Map<string, ProductoListItem>();
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
            id: row.id,
            nombre: row.nombre,
            estado: row.estado,
            categoria: row.cat_id ? { id: row.cat_id, nombre: row.cat_nombre ?? '' } : null,
            variantes: [],
          });
        }
        if (row.var_id) {
          const producto = map.get(row.id);
          if (producto) {
            producto.variantes.push({
              id: row.var_id,
              nombre: row.var_nombre ?? '',
              precio_cop: row.precio_cop ?? 0,
            });
          }
        }
      }
      return [...map.values()].slice(0, limit);
    },
  };
}
