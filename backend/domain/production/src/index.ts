// Aggregates
export { OrdenDeProduccion } from './aggregates/OrdenDeProduccion.js';
export type { OrdenDeProduccionProps } from './aggregates/OrdenDeProduccion.js';
export { DespachoAPunto } from './aggregates/DespachoAPunto.js';
export type { DespachoAPuntoProps } from './aggregates/DespachoAPunto.js';

// Entities
export { LineaDeBOM } from './entities/LineaDeBOM.js';
export type { LineaDeBOMProps } from './entities/LineaDeBOM.js';
export { RegistroDeMerma } from './entities/RegistroDeMerma.js';
export type { RegistroDeMermaProps } from './entities/RegistroDeMerma.js';

// Value Objects
export { Cantidad, CantidadInvalidaError } from './value-objects/Cantidad.js';
export { CodigoDeLote } from './value-objects/CodigoDeLote.js';
export { LoteDeProduccion } from './value-objects/LoteDeProduccion.js';
export {
  EstadoDeOrdenDeProduccion,
  EstadoDeDespacho,
  UnidadDeMedida,
} from './value-objects/enums.js';
export {
  OrdenDeProduccionId,
  LineaDeBOMId,
  RegistroDeMermaId,
  DespachoId,
  ProductVariantIdRef,
  RecipeIdRef,
  IngredientIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
} from './value-objects/ids.js';

// Domain Events
export type {
  ProductionDomainEvent,
  OrdenDeProduccionCreada,
  BOMCalculadoParaOrden,
  IngredientesReservadosParaOrden,
  OrdenDeProduccionIniciada,
  MermaDeProduccionRegistrada,
  OrdenDeProduccionEjecutada,
  OrdenDeProduccionCancelada,
  DespachoPreparado,
  DespachoEnviado,
  DespachoEntregado,
  DespachoCancelado,
} from './events/index.js';

// Errors
export {
  DomainError,
  IdInvalidoError,
  CodigoDeLoteInvalidoError,
  CantidadAProducirInvalidaError,
  CantidadProducidaInvalidaError,
  BOMVacioError,
  LineaDeBOMDuplicadaError,
  IngredienteDuplicadoEnBOMError,
  BOMYaCalculadoError,
  BOMNoCalculadoError,
  TransicionDeEstadoInvalidaError,
  OrdenYaEjecutadaError,
  OrdenYaCanceladaError,
  OrdenNoCancelableError,
  CancelacionSinJustificacionError,
  MermaFueraDeEjecucionError,
  MermaSinMotivoError,
  MermaExcedeConsumoError,
  CantidadDespachadaInvalidaError,
  CantidadDespachadaExcedeLoteError,
  DestinoDespachoInvalidoError,
  DespachoEnEstadoInvalidoError,
  CancelacionDeDespachoSinJustificacionError,
  OrdenNoEncontradaError,
  RecetaSinLineasError,
  UnidadInvalidaError,
  OrdenNoEjecutadaError,
} from './errors/index.js';
