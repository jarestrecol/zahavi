import type { DomainEvent } from '@zahavi/domain-shared-kernel';

export type { DomainEvent };

export interface IngredienteCreado extends DomainEvent {
  readonly tipo: 'IngredienteCreado';
  readonly payload: {
    readonly ingredientId: string;
    readonly nombre: string;
    readonly unidadNativa: string;
    readonly costoUnitarioInicial: number;
    readonly umbralDeAlerta: number;
  };
}

export interface CostoDeIngredienteCambiado extends DomainEvent {
  readonly tipo: 'CostoDeIngredienteCambiado';
  readonly payload: {
    readonly ingredientId: string;
    readonly costoPrevio: number;
    readonly costoNuevo: number;
  };
}

export interface UmbralDeIngredienteCambiado extends DomainEvent {
  readonly tipo: 'UmbralDeIngredienteCambiado';
  readonly payload: {
    readonly ingredientId: string;
    readonly umbralPrevio: number;
    readonly umbralNuevo: number;
  };
}

export interface IngredienteDesactivado extends DomainEvent {
  readonly tipo: 'IngredienteDesactivado';
  readonly payload: { readonly ingredientId: string };
}

export interface IngredienteReactivado extends DomainEvent {
  readonly tipo: 'IngredienteReactivado';
  readonly payload: { readonly ingredientId: string };
}

export interface StockItemCreado extends DomainEvent {
  readonly tipo: 'StockItemCreado';
  readonly payload: {
    readonly stockItemId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidadInicial: number;
    readonly unidad: string;
  };
}

export interface StockItemActualizado extends DomainEvent {
  readonly tipo: 'StockItemActualizado';
  readonly payload: {
    readonly stockItemId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidadAnterior: number;
    readonly cantidadNueva: number;
    readonly unidad: string;
    readonly movimientoId: string;
    readonly tipoMovimiento: string;
  };
}

export interface CompraRegistrada extends DomainEvent {
  readonly tipo: 'CompraRegistrada';
  readonly payload: {
    readonly movimientoId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidad: number;
    readonly unidad: string;
    readonly costoUnitario: number;
    readonly supplierId: string;
  };
}

export interface SalidaDeProduccionRegistrada extends DomainEvent {
  readonly tipo: 'SalidaDeProduccionRegistrada';
  readonly payload: {
    readonly movimientoId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidad: number;
    readonly unidad: string;
    readonly referenciaProduccion: string;
  };
}

export interface MermaRegistrada extends DomainEvent {
  readonly tipo: 'MermaRegistrada';
  readonly payload: {
    readonly movimientoId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidad: number;
    readonly unidad: string;
    readonly motivo: string;
  };
}

export interface AjusteRegistrado extends DomainEvent {
  readonly tipo: 'AjusteRegistrado';
  readonly payload: {
    readonly movimientoId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly cantidadAnterior: number;
    readonly cantidadNueva: number;
    readonly unidad: string;
    readonly motivo: string;
  };
}

export interface AlertaDeStockAbierta extends DomainEvent {
  readonly tipo: 'AlertaDeStockAbierta';
  readonly payload: {
    readonly alertaId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
    readonly stockActual: number;
    readonly umbral: number;
    readonly unidad: string;
  };
}

export interface AlertaDeStockCerrada extends DomainEvent {
  readonly tipo: 'AlertaDeStockCerrada';
  readonly payload: {
    readonly alertaId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
  };
}

export interface AlertaDeStockAnulada extends DomainEvent {
  readonly tipo: 'AlertaDeStockAnulada';
  readonly payload: {
    readonly alertaId: string;
    readonly ingredientId: string;
    readonly businessUnitId: string;
  };
}

export interface ProveedorCreado extends DomainEvent {
  readonly tipo: 'ProveedorCreado';
  readonly payload: {
    readonly supplierId: string;
    readonly nombre: string;
    readonly contacto: string;
  };
}

export interface ProveedorActualizado extends DomainEvent {
  readonly tipo: 'ProveedorActualizado';
  readonly payload: {
    readonly supplierId: string;
    readonly nombre: string;
    readonly contacto: string;
    readonly notas: string;
  };
}

export interface ProveedorDesactivado extends DomainEvent {
  readonly tipo: 'ProveedorDesactivado';
  readonly payload: { readonly supplierId: string };
}

export type InventoryDomainEvent =
  | IngredienteCreado
  | CostoDeIngredienteCambiado
  | UmbralDeIngredienteCambiado
  | IngredienteDesactivado
  | IngredienteReactivado
  | StockItemCreado
  | StockItemActualizado
  | CompraRegistrada
  | SalidaDeProduccionRegistrada
  | MermaRegistrada
  | AjusteRegistrado
  | AlertaDeStockAbierta
  | AlertaDeStockCerrada
  | AlertaDeStockAnulada
  | ProveedorCreado
  | ProveedorActualizado
  | ProveedorDesactivado;
