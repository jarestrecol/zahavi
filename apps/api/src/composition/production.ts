import {
  CrearOrdenDeProduccion,
  CalcularBOMYReservar,
  IniciarOrden,
  RegistrarMermaEnOrden,
  EjecutarOrden,
  CancelarOrden,
  PrepararDespacho,
  ListarOrdenes,
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
  listarOrdenes: ListarOrdenes;
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
    listarOrdenes: new ListarOrdenes(repositorioDeOrdenes),
  };
}
