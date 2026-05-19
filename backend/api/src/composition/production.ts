import {
  CrearOrdenDeProduccion,
  CalcularBOMYReservar,
  IniciarOrden,
  RegistrarMermaEnOrden,
  EjecutarOrden,
  CancelarOrden,
  PrepararDespacho,
  EnviarDespacho,
  EntregarDespacho,
  CancelarDespacho,
  ListarOrdenes,
  ListarDespachos,
} from '@zahavi/application';
import type { ProductionAdapters } from '@zahavi/adapter-persistence-supabase';

export interface ProductionComposition {
  crearOrden: CrearOrdenDeProduccion;
  calcularBOMYReservar: CalcularBOMYReservar;
  iniciarOrden: IniciarOrden;
  registrarMerma: RegistrarMermaEnOrden;
  ejecutarOrden: EjecutarOrden;
  cancelarOrden: CancelarOrden;
  prepararDespacho: PrepararDespacho;
  enviarDespacho: EnviarDespacho;
  entregarDespacho: EntregarDespacho;
  cancelarDespacho: CancelarDespacho;
  listarOrdenes: ListarOrdenes;
  listarDespachos: ListarDespachos;
}

export function createProductionComposition(adapters: ProductionAdapters): ProductionComposition {
  const { repositorioDeOrdenes, repositorioDeDespachos, consultorDeReceta } = adapters;

  return {
    crearOrden: new CrearOrdenDeProduccion(repositorioDeOrdenes),
    calcularBOMYReservar: new CalcularBOMYReservar(repositorioDeOrdenes, consultorDeReceta),
    iniciarOrden: new IniciarOrden(repositorioDeOrdenes),
    registrarMerma: new RegistrarMermaEnOrden(repositorioDeOrdenes),
    ejecutarOrden: new EjecutarOrden(repositorioDeOrdenes),
    cancelarOrden: new CancelarOrden(repositorioDeOrdenes),
    prepararDespacho: new PrepararDespacho(repositorioDeOrdenes, repositorioDeDespachos),
    enviarDespacho: new EnviarDespacho(repositorioDeDespachos),
    entregarDespacho: new EntregarDespacho(repositorioDeDespachos),
    cancelarDespacho: new CancelarDespacho(repositorioDeDespachos),
    listarOrdenes: new ListarOrdenes(repositorioDeOrdenes),
    listarDespachos: new ListarDespachos(repositorioDeDespachos),
  };
}
