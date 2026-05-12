import type { EstadoDeProducto, EstadoDeCombo, EstadoDeCategoria, Unidad } from '../value-objects/enums.js';

export interface DomainEvent {
  readonly eventoId: string;
  readonly tipo: string;
  readonly aggregateId: string;
  readonly ocurridoEn: number; // timestamp ms
  readonly version: number;
}

// ──────────────────────────────────────────────────────────────
// Eventos de Producto
// ──────────────────────────────────────────────────────────────

export interface ProductoCreadoEvent extends DomainEvent {
  readonly tipo: 'ProductoCreado';
  readonly payload: {
    readonly productoId: string;
    readonly nombre: string;
    readonly categoriaId: string;
    readonly varianteInicialId: string;
    readonly precioVarianteInicialCop: number;
    readonly estado: EstadoDeProducto;
  };
}

export interface ProductoActivadoEvent extends DomainEvent {
  readonly tipo: 'ProductoActivado';
  readonly payload: {
    readonly productoId: string;
  };
}

export interface ProductoDesactivadoEvent extends DomainEvent {
  readonly tipo: 'ProductoDesactivado';
  readonly payload: {
    readonly productoId: string;
    readonly motivo: string;
  };
}

export interface VarianteAgregadaAProductoEvent extends DomainEvent {
  readonly tipo: 'VarianteAgregadaAProducto';
  readonly payload: {
    readonly productoId: string;
    readonly varianteId: string;
    readonly nombre: string;
    readonly precioCop: number;
  };
}

export interface VarianteEliminadaDeProductoEvent extends DomainEvent {
  readonly tipo: 'VarianteEliminadaDeProducto';
  readonly payload: {
    readonly productoId: string;
    readonly varianteId: string;
  };
}

export interface PrecioDeVarianteCambiadoEvent extends DomainEvent {
  readonly tipo: 'PrecioDeVarianteCambiado';
  readonly payload: {
    readonly productoId: string;
    readonly varianteId: string;
    readonly precioAnteriorCop: number;
    readonly precioNuevoCop: number;
  };
}

export interface RecetaVinculadaAVarianteEvent extends DomainEvent {
  readonly tipo: 'RecetaVinculadaAVariante';
  readonly payload: {
    readonly productoId: string;
    readonly varianteId: string;
    readonly recetaId: string;
  };
}

export interface ImagenDeProductoCambiadaEvent extends DomainEvent {
  readonly tipo: 'ImagenDeProductoCambiada';
  readonly payload: {
    readonly productoId: string;
    readonly imagenAnteriorUrl: string | null;
    readonly imagenNuevaUrl: string | null;
  };
}

export interface NombreDeProductoCambiadoEvent extends DomainEvent {
  readonly tipo: 'NombreDeProductoCambiado';
  readonly payload: {
    readonly productoId: string;
    readonly nombreAnterior: string;
    readonly nombreNuevo: string;
  };
}

export interface CategoriaDeProductoCambiadaEvent extends DomainEvent {
  readonly tipo: 'CategoriaDeProductoCambiada';
  readonly payload: {
    readonly productoId: string;
    readonly categoriaAnteriorId: string;
    readonly categoriaNuevaId: string;
  };
}

// ──────────────────────────────────────────────────────────────
// Eventos de Categoria
// ──────────────────────────────────────────────────────────────

export interface CategoriaCreadaEvent extends DomainEvent {
  readonly tipo: 'CategoriaCreada';
  readonly payload: {
    readonly categoriaId: string;
    readonly nombre: string;
    readonly padreId: string | null;
    readonly orden: number;
  };
}

export interface NombreDeCategoriaCambiadoEvent extends DomainEvent {
  readonly tipo: 'NombreDeCategoriaCambiado';
  readonly payload: {
    readonly categoriaId: string;
    readonly nombreAnterior: string;
    readonly nombreNuevo: string;
  };
}

export interface OrdenDeCategoriaCambiadoEvent extends DomainEvent {
  readonly tipo: 'OrdenDeCategoriaCambiado';
  readonly payload: {
    readonly categoriaId: string;
    readonly ordenAnterior: number;
    readonly ordenNuevo: number;
  };
}

export interface PadreDeCategoriaCambiadoEvent extends DomainEvent {
  readonly tipo: 'PadreDeCategoriaCambiado';
  readonly payload: {
    readonly categoriaId: string;
    readonly padreAnteriorId: string | null;
    readonly padreNuevoId: string | null;
  };
}

export interface CategoriaArchivadaEvent extends DomainEvent {
  readonly tipo: 'CategoriaArchivada';
  readonly payload: {
    readonly categoriaId: string;
    readonly estadoAnterior: EstadoDeCategoria;
  };
}

export interface CategoriaRestauradaEvent extends DomainEvent {
  readonly tipo: 'CategoriaRestaurada';
  readonly payload: {
    readonly categoriaId: string;
  };
}

// ──────────────────────────────────────────────────────────────
// Eventos de Receta
// ──────────────────────────────────────────────────────────────

export interface RecetaCreadaEvent extends DomainEvent {
  readonly tipo: 'RecetaCreada';
  readonly payload: {
    readonly recetaId: string;
    readonly varianteId: string;
    readonly cantidadDeLineas: number;
    readonly versionInicial: number;
  };
}

export interface RecetaActualizadaEvent extends DomainEvent {
  readonly tipo: 'RecetaActualizada';
  readonly payload: {
    readonly recetaId: string;
    readonly varianteId: string;
    readonly versionAnterior: number;
    readonly versionNueva: number;
    readonly cambios: ReadonlyArray<{
      readonly tipo: 'agregada' | 'eliminada' | 'actualizada';
      readonly lineaId: string;
      readonly ingredientId: string;
      readonly cantidadValor?: number;
      readonly unidad?: Unidad;
    }>;
  };
}

// ──────────────────────────────────────────────────────────────
// Eventos de Combo
// ──────────────────────────────────────────────────────────────

export interface ComboCreadoEvent extends DomainEvent {
  readonly tipo: 'ComboCreado';
  readonly payload: {
    readonly comboId: string;
    readonly nombre: string;
    readonly precioCop: number;
    readonly cantidadDeItems: number;
    readonly estado: EstadoDeCombo;
  };
}

export interface ComboActivadoEvent extends DomainEvent {
  readonly tipo: 'ComboActivado';
  readonly payload: {
    readonly comboId: string;
  };
}

export interface ComboDesactivadoEvent extends DomainEvent {
  readonly tipo: 'ComboDesactivado';
  readonly payload: {
    readonly comboId: string;
  };
}

export interface ItemAgregadoAlComboEvent extends DomainEvent {
  readonly tipo: 'ItemAgregadoAlCombo';
  readonly payload: {
    readonly comboId: string;
    readonly itemId: string;
    readonly productVariantId: string;
    readonly cantidadValor: number;
    readonly unidad: Unidad;
  };
}

export interface ItemEliminadoDelComboEvent extends DomainEvent {
  readonly tipo: 'ItemEliminadoDelCombo';
  readonly payload: {
    readonly comboId: string;
    readonly itemId: string;
  };
}

export interface PrecioDeComboCambiadoEvent extends DomainEvent {
  readonly tipo: 'PrecioDeComboCambiado';
  readonly payload: {
    readonly comboId: string;
    readonly precioAnteriorCop: number;
    readonly precioNuevoCop: number;
  };
}

export interface VigenciaDeComboCambiadaEvent extends DomainEvent {
  readonly tipo: 'VigenciaDeComboCambiada';
  readonly payload: {
    readonly comboId: string;
    readonly vigenciaDesdeMs: number | null;
    readonly vigenciaHastaMs: number | null;
  };
}

// ──────────────────────────────────────────────────────────────
// Unión discriminada
// ──────────────────────────────────────────────────────────────

export type CatalogDomainEvent =
  | ProductoCreadoEvent
  | ProductoActivadoEvent
  | ProductoDesactivadoEvent
  | VarianteAgregadaAProductoEvent
  | VarianteEliminadaDeProductoEvent
  | PrecioDeVarianteCambiadoEvent
  | RecetaVinculadaAVarianteEvent
  | ImagenDeProductoCambiadaEvent
  | NombreDeProductoCambiadoEvent
  | CategoriaDeProductoCambiadaEvent
  | CategoriaCreadaEvent
  | NombreDeCategoriaCambiadoEvent
  | OrdenDeCategoriaCambiadoEvent
  | PadreDeCategoriaCambiadoEvent
  | CategoriaArchivadaEvent
  | CategoriaRestauradaEvent
  | RecetaCreadaEvent
  | RecetaActualizadaEvent
  | ComboCreadoEvent
  | ComboActivadoEvent
  | ComboDesactivadoEvent
  | ItemAgregadoAlComboEvent
  | ItemEliminadoDelComboEvent
  | PrecioDeComboCambiadoEvent
  | VigenciaDeComboCambiadaEvent;
