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

export interface CatalogComposition {
  crearProducto: CrearProducto;
  activarProducto: ActivarProducto;
  archivarProducto: ArchivarProducto;
  crearCategoria: CrearCategoria;
  archivarCategoria: ArchivarCategoria;
  crearReceta: CrearReceta;
  calcularEscandallo: CalcularEscandallo;
  crearCombo: CrearCombo;
}

export function createCatalogComposition(adapters: CatalogAdapters): CatalogComposition {
  const {
    repositorioDeCategorias,
    repositorioDeProductos,
    repositorioDeRecetas,
    repositorioDeCombos,
    consultorDeCostos,
    publicadorDeEventos,
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
  };
}
