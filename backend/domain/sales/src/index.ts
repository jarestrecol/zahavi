// Aggregates
export { Mesa } from './aggregates/Mesa.js';
export type { MesaProps } from './aggregates/Mesa.js';
export { Comanda } from './aggregates/Comanda.js';
export type { ComandaProps, DatosDeProductoParaLinea } from './aggregates/Comanda.js';
export { Cobro } from './aggregates/Cobro.js';
export type { CobroProps } from './aggregates/Cobro.js';
export { Factura } from './aggregates/Factura.js';
export type { FacturaProps } from './aggregates/Factura.js';

// Entities
export { LineaDeComanda } from './entities/LineaDeComanda.js';
export type { LineaDeComandaProps } from './entities/LineaDeComanda.js';

// Value Objects
export { Dinero } from './value-objects/Dinero.js';
export { TasaIVA } from './value-objects/TasaIVA.js';
export { PagoDetalle } from './value-objects/PagoDetalle.js';
export { NombreMesa } from './value-objects/NombreMesa.js';
export { NumeroFactura } from './value-objects/NumeroFactura.js';
export { FacturaLinea } from './value-objects/FacturaLinea.js';
export {
  EstadoDeMesa,
  TipoDeMesa,
  EstadoDeComanda,
  EstadoDeLinea,
  EstadoDeCobro,
  EstadoDeFactura,
  MetodoDePago,
} from './value-objects/enums.js';
export {
  MesaId,
  ComandaId,
  LineaDeComandaId,
  CobroId,
  FacturaId,
  ProductVariantIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
} from './value-objects/ids.js';

// Domain Events
export type {
  SalesDomainEvent,
  MesaDomainEvent,
  ComandaDomainEvent,
  CobroDomainEvent,
  FacturaDomainEvent,
  MesaConfigurada,
  MesaOcupada,
  MesaLiberada,
  MesaEnCobro,
  ComandaCreada,
  LineaAgregadaAComanda,
  LineaCancelada,
  ComandaEnviada,
  ComandaEnPreparacion,
  ComandaLista,
  ComandaCerrada,
  ComandaCancelada,
  CobroCreado,
  CobroProcesado,
  CobroAnulado,
  FacturaEmitida,
  FacturaAnulada,
} from './events/index.js';

// Errors
export {
  DomainError,
  IdInvalidoError,
  NombreMesaInvalidoError,
  MontoInvalidoError,
  MontoNegativoError,
  TasaIVAInvalidaError,
  TransicionDeMesaInvalidaError,
  MesaYaOcupadaError,
  ComandaSinLineasError,
  ComandaNoModificableError,
  TransicionDeComandaInvalidaError,
  LineaNoEncontradaError,
  CantidadDeLineaInvalidaError,
  CancelacionSinMotivoError,
  CobrosIncompletosError,
  CobroYaProcesadoError,
  CobroNoAnulableError,
  PagosVaciosError,
  FacturaYaAnuladaError,
  NumeroFacturaInvalidoError,
  MesaNoEncontradaError,
  ComandaNoEncontradaError,
  CobroNoEncontradoError,
  ProductoNoEncontradoError,
  ComandaNoListaError,
  CobroNoProcesadoError,
  MetodoDePagoInvalidoError,
} from './errors/index.js';
export type { SalesDomainError } from './errors/index.js';
