import {
  CrearIngrediente,
  CrearProveedor,
  RegistrarIngreso,
  RegistrarSalida,
  RegistrarMerma,
  AjustarStock,
  ListarStockActual,
  HistoricoMovimientos,
  ConfigurarAlertaIngrediente,
} from '@zahavi/application';
import type { InventoryAdapters } from '@zahavi/adapter-persistence-supabase';

export interface InventoryComposition {
  crearIngrediente: CrearIngrediente;
  crearProveedor: CrearProveedor;
  registrarIngreso: RegistrarIngreso;
  registrarSalida: RegistrarSalida;
  registrarMerma: RegistrarMerma;
  ajustarStock: AjustarStock;
  listarStockActual: ListarStockActual;
  historicoMovimientos: HistoricoMovimientos;
  configurarAlertaIngrediente: ConfigurarAlertaIngrediente;
}

export function createInventoryComposition(adapters: InventoryAdapters): InventoryComposition {
  const {
    repositorioDeIngredientes,
    repositorioDeStockItems,
    repositorioDeMovimientos,
    repositorioDeAlertas,
    repositorioDeProveedores,
    publicadorDeEventos,
  } = adapters;

  return {
    crearIngrediente: new CrearIngrediente(repositorioDeIngredientes, publicadorDeEventos),
    crearProveedor: new CrearProveedor(repositorioDeProveedores, publicadorDeEventos),
    registrarIngreso: new RegistrarIngreso(
      repositorioDeIngredientes,
      repositorioDeStockItems,
      repositorioDeMovimientos,
      repositorioDeAlertas,
      repositorioDeProveedores,
      publicadorDeEventos,
    ),
    registrarSalida: new RegistrarSalida(
      repositorioDeIngredientes,
      repositorioDeStockItems,
      repositorioDeMovimientos,
      repositorioDeAlertas,
      publicadorDeEventos,
    ),
    registrarMerma: new RegistrarMerma(
      repositorioDeIngredientes,
      repositorioDeStockItems,
      repositorioDeMovimientos,
      repositorioDeAlertas,
      publicadorDeEventos,
    ),
    ajustarStock: new AjustarStock(
      repositorioDeIngredientes,
      repositorioDeStockItems,
      repositorioDeMovimientos,
      repositorioDeAlertas,
      publicadorDeEventos,
    ),
    listarStockActual: new ListarStockActual(repositorioDeStockItems),
    historicoMovimientos: new HistoricoMovimientos(repositorioDeMovimientos),
    configurarAlertaIngrediente: new ConfigurarAlertaIngrediente(
      repositorioDeIngredientes,
      publicadorDeEventos,
    ),
  };
}
