import { DomainError } from './DomainError.js';

export { DomainError };

// ──────────────────────────────────────────────────────────────
// IDs y formato
// ──────────────────────────────────────────────────────────────

export class IdInvalidoError extends DomainError {
  readonly code = 'PRODUCTION_ID_INVALIDO';
  constructor(tipo: string, valor?: string) {
    super(`ID inválido para ${tipo}${valor === undefined ? '' : `: "${valor}"`}.`);
  }
}

export class CodigoDeLoteInvalidoError extends DomainError {
  readonly code = 'PRODUCTION_CODIGO_LOTE_INVALIDO';
  constructor(razon: string) {
    super(`Código de lote inválido: ${razon}.`);
  }
}

// ──────────────────────────────────────────────────────────────
// Orden de Producción — invariantes de creación y BOM
// ──────────────────────────────────────────────────────────────

export class CantidadAProducirInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_CANTIDAD_A_PRODUCIR_INVALIDA';
  constructor(cantidad: number) {
    super(`La cantidad a producir debe ser un entero > 0. Recibido: ${cantidad}.`);
  }
}

export class CantidadProducidaInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_CANTIDAD_PRODUCIDA_INVALIDA';
  constructor(producida: number, planeada: number) {
    super(
      `Cantidad producida inválida: ${producida}. ` +
        `Debe ser > 0 y <= cantidad planeada (${planeada}).`,
    );
  }
}

export class BOMVacioError extends DomainError {
  readonly code = 'PRODUCTION_BOM_VACIO';
  constructor(ordenId: string) {
    super(`El BOM de la orden "${ordenId}" no puede estar vacío.`);
  }
}

export class LineaDeBOMDuplicadaError extends DomainError {
  readonly code = 'PRODUCTION_LINEA_BOM_DUPLICADA';
  constructor(lineaId: string) {
    super(`Línea de BOM duplicada: "${lineaId}".`);
  }
}

export class IngredienteDuplicadoEnBOMError extends DomainError {
  readonly code = 'PRODUCTION_INGREDIENTE_DUPLICADO_EN_BOM';
  constructor(ingredientId: string) {
    super(`El ingrediente "${ingredientId}" aparece más de una vez en el BOM.`);
  }
}

export class BOMYaCalculadoError extends DomainError {
  readonly code = 'PRODUCTION_BOM_YA_CALCULADO';
  constructor(ordenId: string) {
    super(`El BOM de la orden "${ordenId}" ya fue calculado y no puede recalcularse.`);
  }
}

export class BOMNoCalculadoError extends DomainError {
  readonly code = 'PRODUCTION_BOM_NO_CALCULADO';
  constructor(ordenId: string) {
    super(
      `La orden "${ordenId}" no tiene BOM calculado. ` +
        `Calcule el BOM antes de reservar o ejecutar.`,
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Estado de la Orden — transiciones inválidas
// ──────────────────────────────────────────────────────────────

export class TransicionDeEstadoInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_TRANSICION_DE_ESTADO_INVALIDA';
  constructor(ordenId: string, estadoActual: string, estadoDestino: string) {
    super(`Transición inválida para orden "${ordenId}": ${estadoActual} → ${estadoDestino}.`);
  }
}

export class OrdenYaEjecutadaError extends DomainError {
  readonly code = 'PRODUCTION_ORDEN_YA_EJECUTADA';
  constructor(ordenId: string) {
    super(`La orden "${ordenId}" ya fue ejecutada.`);
  }
}

export class OrdenYaCanceladaError extends DomainError {
  readonly code = 'PRODUCTION_ORDEN_YA_CANCELADA';
  constructor(ordenId: string) {
    super(`La orden "${ordenId}" ya fue cancelada.`);
  }
}

export class OrdenNoCancelableError extends DomainError {
  readonly code = 'PRODUCTION_ORDEN_NO_CANCELABLE';
  constructor(ordenId: string, estadoActual: string) {
    super(
      `La orden "${ordenId}" no se puede cancelar en estado "${estadoActual}". ` +
        `Solo PLANIFICADA o RESERVADA admiten cancelación.`,
    );
  }
}

export class CancelacionSinJustificacionError extends DomainError {
  readonly code = 'PRODUCTION_CANCELACION_SIN_JUSTIFICACION';
  constructor() {
    super('La cancelación de una orden de producción requiere motivo no vacío.');
  }
}

// ──────────────────────────────────────────────────────────────
// Merma
// ──────────────────────────────────────────────────────────────

export class MermaFueraDeEjecucionError extends DomainError {
  readonly code = 'PRODUCTION_MERMA_FUERA_DE_EJECUCION';
  constructor(ordenId: string, estadoActual: string) {
    super(
      `No se puede registrar merma en orden "${ordenId}" estando en estado "${estadoActual}". ` +
        `Solo se admiten mermas durante EN_EJECUCION.`,
    );
  }
}

export class MermaSinMotivoError extends DomainError {
  readonly code = 'PRODUCTION_MERMA_SIN_MOTIVO';
  constructor() {
    super('Un registro de merma requiere motivo no vacío.');
  }
}

export class MermaExcedeConsumoError extends DomainError {
  readonly code = 'PRODUCTION_MERMA_EXCEDE_CONSUMO';
  constructor(ingredientId: string, mermaIntentada: number, consumoMaximo: number) {
    super(
      `Merma de "${ingredientId}" (${mermaIntentada}) excede el consumo reportado para esa orden ` +
        `(${consumoMaximo}).`,
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de infraestructura / aplicación (usados en casos de uso)
// ──────────────────────────────────────────────────────────────

export class OrdenNoEncontradaError extends DomainError {
  readonly code = 'PRODUCTION_ORDEN_NO_ENCONTRADA';
  constructor(ordenId: string) {
    super(`Orden de producción "${ordenId}" no encontrada.`);
  }
}

export class RecetaSinLineasError extends DomainError {
  readonly code = 'PRODUCTION_RECETA_SIN_LINEAS';
  constructor(recetaId: string) {
    super(`La receta "${recetaId}" no tiene líneas configuradas.`);
  }
}

export class UnidadInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_UNIDAD_INVALIDA';
  constructor(unidad: string) {
    super(`Unidad de medida "${unidad}" no reconocida en Production.`);
  }
}

export class OrdenNoEjecutadaError extends DomainError {
  readonly code = 'PRODUCTION_ORDEN_NO_EJECUTADA';
  constructor(ordenId: string) {
    super(`Orden "${ordenId}" no está en estado EJECUTADA o no tiene lote producido.`);
  }
}

// ──────────────────────────────────────────────────────────────
// Despacho
// ──────────────────────────────────────────────────────────────

export class CantidadDespachadaInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_CANTIDAD_DESPACHADA_INVALIDA';
  constructor(cantidad: number) {
    super(`Cantidad despachada debe ser un entero > 0. Recibido: ${cantidad}.`);
  }
}

export class CantidadDespachadaExcedeLoteError extends DomainError {
  readonly code = 'PRODUCTION_CANTIDAD_DESPACHADA_EXCEDE_LOTE';
  constructor(despachada: number, loteCantidad: number) {
    super(`La cantidad despachada (${despachada}) excede la del lote producido (${loteCantidad}).`);
  }
}

export class DestinoDespachoInvalidoError extends DomainError {
  readonly code = 'PRODUCTION_DESTINO_DESPACHO_INVALIDO';
  constructor(razon: string) {
    super(`Destino de despacho inválido: ${razon}.`);
  }
}

export class DespachoEnEstadoInvalidoError extends DomainError {
  readonly code = 'PRODUCTION_DESPACHO_EN_ESTADO_INVALIDO';
  constructor(despachoId: string, estadoActual: string, accion: string) {
    super(
      `No se puede ejecutar la acción "${accion}" sobre despacho "${despachoId}" en estado "${estadoActual}".`,
    );
  }
}

export class CancelacionDeDespachoSinJustificacionError extends DomainError {
  readonly code = 'PRODUCTION_CANCELACION_DESPACHO_SIN_JUSTIFICACION';
  constructor() {
    super('La cancelación de un despacho requiere motivo no vacío.');
  }
}
