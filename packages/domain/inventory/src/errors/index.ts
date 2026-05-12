import { DomainError } from './DomainError.js';

export { DomainError };

export class IdInvalidoError extends DomainError {
  readonly code = 'INVENTORY_ID_INVALIDO';
  constructor(tipo: string) {
    super(`ID inválido para ${tipo}.`);
  }
}

export class CantidadInvalidaError extends DomainError {
  readonly code = 'INVENTORY_CANTIDAD_INVALIDA';
  constructor(cantidad: number, detalle?: string) {
    super(`Cantidad inválida: ${cantidad}.${detalle ? ` ${detalle}` : ''}`);
  }
}

export class UnidadInvalidaError extends DomainError {
  readonly code = 'INVENTORY_UNIDAD_INVALIDA';
  constructor(unidad: string) {
    super(`Unidad no soportada: ${unidad}.`);
  }
}

export class StockInsuficienteError extends DomainError {
  readonly code = 'INVENTORY_STOCK_INSUFICIENTE';
  constructor(ingredientId: string, requerido: number, disponible: number) {
    super(
      `Stock insuficiente para ingrediente "${ingredientId}". Requerido: ${requerido}, disponible: ${disponible}.`,
    );
  }
}

export class IngredienteNoEncontradoError extends DomainError {
  readonly code = 'INVENTORY_INGREDIENTE_NO_ENCONTRADO';
  constructor(ingredientId: string) {
    super(`Ingrediente "${ingredientId}" no encontrado.`);
  }
}

export class ProveedorNoEncontradoError extends DomainError {
  readonly code = 'INVENTORY_PROVEEDOR_NO_ENCONTRADO';
  constructor(supplierId: string) {
    super(`Proveedor "${supplierId}" no encontrado.`);
  }
}

export class AlertaYaAbriertaError extends DomainError {
  readonly code = 'INVENTORY_ALERTA_YA_ABIERTA';
  constructor(ingredientId: string) {
    super(`Alerta de stock ya abierta para ingrediente "${ingredientId}".`);
  }
}

export class AlertaNoEncontradaError extends DomainError {
  readonly code = 'INVENTORY_ALERTA_NO_ENCONTRADA';
  constructor(alertaId: string) {
    super(`Alerta "${alertaId}" no encontrada.`);
  }
}

export class AlertaNoAbiertaError extends DomainError {
  readonly code = 'INVENTORY_ALERTA_NO_ABIERTA';
  constructor(alertaId: string, estadoActual: string) {
    super(`La alerta "${alertaId}" no está abierta (estado actual: ${estadoActual}).`);
  }
}

export class CostoUnitarioNegativoError extends DomainError {
  readonly code = 'INVENTORY_COSTO_UNITARIO_NEGATIVO';
  constructor(costo: number) {
    super(`Costo unitario no puede ser negativo: ${costo}.`);
  }
}

export class UmbralDeAlertaInvalidoError extends DomainError {
  readonly code = 'INVENTORY_UMBRAL_ALERTA_INVALIDO';
  constructor(detalle?: string) {
    super(`Umbral de alerta inválido.${detalle ? ` ${detalle}` : ''}`);
  }
}

export class MovimientoReferenciaDuplicadaError extends DomainError {
  readonly code = 'INVENTORY_MOVIMIENTO_REFERENCIA_DUPLICADA';
  constructor(referencia: string) {
    super(`Ya existe un movimiento con referencia externa "${referencia}".`);
  }
}

export class IngredienteSinUnidadNativaError extends DomainError {
  readonly code = 'INVENTORY_INGREDIENTE_SIN_UNIDAD_NATIVA';
  constructor(ingredientId: string) {
    super(`Ingrediente "${ingredientId}" debe tener una unidad nativa definida.`);
  }
}

export class SupplierYaExisteError extends DomainError {
  readonly code = 'INVENTORY_SUPPLIER_YA_EXISTE';
  constructor(supplierId: string) {
    super(`Proveedor "${supplierId}" ya existe.`);
  }
}

export class CompraVaciaError extends DomainError {
  readonly code = 'INVENTORY_COMPRA_VACIA';
  constructor() {
    super('Una compra debe contener al menos una línea de ingrediente.');
  }
}

export class IngredienteYaEnEstadoError extends DomainError {
  readonly code = 'INVENTORY_INGREDIENTE_YA_EN_ESTADO';
  constructor(estado: string) {
    super(`El ingrediente ya está en estado "${estado}".`);
  }
}

export class StockNegativoError extends DomainError {
  readonly code = 'INVENTORY_STOCK_NEGATIVO';
  constructor(ingredientId: string, intentado: number) {
    super(
      `Operación dejaría stock negativo para "${ingredientId}". ` +
        `Intentado: ${intentado}. Use ajuste con justificación para correcciones manuales.`,
    );
  }
}

export class AjusteSinJustificacionError extends DomainError {
  readonly code = 'INVENTORY_AJUSTE_SIN_JUSTIFICACION';
  constructor() {
    super('Un ajuste manual de stock requiere justificación no vacía.');
  }
}

export class ProveedorYaInactivoError extends DomainError {
  readonly code = 'INVENTORY_PROVEEDOR_YA_INACTIVO';
  constructor(supplierId: string) {
    super(`Proveedor "${supplierId}" ya está inactivo.`);
  }
}

export class StockItemNoEncontradoError extends DomainError {
  readonly code = 'INVENTORY_STOCK_ITEM_NO_ENCONTRADO';
  constructor(ingredientId: string, businessUnitId: string) {
    super(
      `Stock item no encontrado para ingrediente "${ingredientId}" ` +
        `en unidad de negocio "${businessUnitId}".`,
    );
  }
}
