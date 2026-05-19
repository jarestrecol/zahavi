import {
  ConfigurarMesa,
  AbrirMesaAdHoc,
  CrearComanda,
  AgregarLineaAComanda,
  CancelarLineaDeComanda,
  EnviarComandaACocina,
  MarcarComandaEnPreparacion,
  MarcarComandaLista,
  ProcesarCobro,
  EmitirFactura,
  ListarMesas,
  ObtenerComanda,
} from '@zahavi/application';
import type { SalesAdapters } from '@zahavi/adapter-persistence-supabase';

export interface SalesComposition {
  configurarMesa: ConfigurarMesa;
  abrirMesaAdHoc: AbrirMesaAdHoc;
  crearComanda: CrearComanda;
  agregarLinea: AgregarLineaAComanda;
  cancelarLinea: CancelarLineaDeComanda;
  enviarComanda: EnviarComandaACocina;
  marcarEnPreparacion: MarcarComandaEnPreparacion;
  marcarLista: MarcarComandaLista;
  procesarCobro: ProcesarCobro;
  emitirFactura: EmitirFactura;
  listarMesas: ListarMesas;
  obtenerComanda: ObtenerComanda;
}

export function createSalesComposition(adapters: SalesAdapters): SalesComposition {
  const {
    repositorioDeMesas,
    repositorioDeComandas,
    repositorioDeCobros,
    repositorioDeFacturas,
    consultorDeProducto,
  } = adapters;

  return {
    configurarMesa: new ConfigurarMesa(repositorioDeMesas),
    abrirMesaAdHoc: new AbrirMesaAdHoc(repositorioDeMesas),
    crearComanda: new CrearComanda(repositorioDeMesas, repositorioDeComandas),
    agregarLinea: new AgregarLineaAComanda(repositorioDeComandas, consultorDeProducto),
    cancelarLinea: new CancelarLineaDeComanda(repositorioDeComandas),
    enviarComanda: new EnviarComandaACocina(repositorioDeComandas),
    marcarEnPreparacion: new MarcarComandaEnPreparacion(repositorioDeComandas),
    marcarLista: new MarcarComandaLista(repositorioDeComandas),
    procesarCobro: new ProcesarCobro(
      repositorioDeComandas,
      repositorioDeCobros,
      repositorioDeMesas,
    ),
    emitirFactura: new EmitirFactura(
      repositorioDeCobros,
      repositorioDeComandas,
      repositorioDeFacturas,
    ),
    listarMesas: new ListarMesas(repositorioDeMesas),
    obtenerComanda: new ObtenerComanda(repositorioDeComandas),
  };
}
