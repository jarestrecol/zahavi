import type {
  ProductoCreadoEvent,
  ProductoActivadoEvent,
  ProductoDesactivadoEvent,
  VarianteAgregadaAProductoEvent,
  VarianteEliminadaDeProductoEvent,
  PrecioDeVarianteCambiadoEvent,
  RecetaVinculadaAVarianteEvent,
  NombreDeProductoCambiadoEvent,
  CategoriaDeProductoCambiadaEvent,
  ImagenDeProductoCambiadaEvent,
  CategoriaCreadaEvent,
  NombreDeCategoriaCambiadoEvent,
  OrdenDeCategoriaCambiadoEvent,
  PadreDeCategoriaCambiadoEvent,
  CategoriaArchivadaEvent,
  CategoriaRestauradaEvent,
  RecetaCreadaEvent,
  RecetaActualizadaEvent,
  ComboCreadoEvent,
  ComboDesactivadoEvent,
  ComboActivadoEvent,
  ItemAgregadoAlComboEvent,
  ItemEliminadoDelComboEvent,
  PrecioDeComboCambiadoEvent,
  VigenciaDeComboCambiadaEvent,
} from '@zahavi/domain-catalog';

export type CatalogDomainEvent =
  | ProductoCreadoEvent
  | ProductoActivadoEvent
  | ProductoDesactivadoEvent
  | VarianteAgregadaAProductoEvent
  | VarianteEliminadaDeProductoEvent
  | PrecioDeVarianteCambiadoEvent
  | RecetaVinculadaAVarianteEvent
  | NombreDeProductoCambiadoEvent
  | CategoriaDeProductoCambiadaEvent
  | ImagenDeProductoCambiadaEvent
  | CategoriaCreadaEvent
  | NombreDeCategoriaCambiadoEvent
  | OrdenDeCategoriaCambiadoEvent
  | PadreDeCategoriaCambiadoEvent
  | CategoriaArchivadaEvent
  | CategoriaRestauradaEvent
  | RecetaCreadaEvent
  | RecetaActualizadaEvent
  | ComboCreadoEvent
  | ComboDesactivadoEvent
  | ComboActivadoEvent
  | ItemAgregadoAlComboEvent
  | ItemEliminadoDelComboEvent
  | PrecioDeComboCambiadoEvent
  | VigenciaDeComboCambiadaEvent;

/**
 * Puerto: Publicador de Domain Events de Catalog.
 * Responsabilidad: emitir eventos de dominio para que otros BCs reaccionen.
 * Estos eventos son el mecanismo de eventual consistency entre BC.
 */
export interface IPublicadorDeDomainEventsCatalog {
  /**
   * Publicar un evento de Catalog.
   * El adaptador es responsable de entregar el evento a los suscriptores
   * (puede ser Supabase Realtime, message queue, webhook, etc).
   */
  publicar(evento: CatalogDomainEvent, correlacionId: string): Promise<void>;

  /**
   * Publicar múltiples eventos de forma atómica (si el adaptador lo permite).
   */
  publicarLote(eventos: ReadonlyArray<CatalogDomainEvent>, correlacionId: string): Promise<void>;
}
