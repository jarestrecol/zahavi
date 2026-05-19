export { DomainError } from './DomainError.js';
export type { Result } from './DomainError.js';

import { DomainError } from './DomainError.js';

// ── IDs ─────────────────────────────────────────────────────────

export class IdInvalidoError extends DomainError {
  readonly code = 'SALES_ID_INVALIDO' as const;
  constructor(tipo: string, valor: string) {
    super(`ID inválido para ${tipo}: "${valor}"`);
  }
}

export class NombreMesaInvalidoError extends DomainError {
  readonly code = 'SALES_NOMBRE_MESA_INVALIDO' as const;
  constructor() {
    super('El nombre de la mesa no puede estar vacío');
  }
}

// ── Dinero ───────────────────────────────────────────────────────

export class MontoInvalidoError extends DomainError {
  readonly code = 'SALES_MONTO_INVALIDO' as const;
  constructor(monto: number) {
    super(`El monto debe ser un entero no negativo, se recibió: ${monto}`);
  }
}

export class MontoNegativoError extends DomainError {
  readonly code = 'SALES_MONTO_NEGATIVO' as const;
  constructor() {
    super('La resta resultaría en un monto negativo');
  }
}

export class TasaIVAInvalidaError extends DomainError {
  readonly code = 'SALES_TASA_IVA_INVALIDA' as const;
  constructor(tasa: number) {
    super(`Tasa de IVA inválida: ${tasa}. Solo se acepta 0 o 0.19`);
  }
}

// ── Mesa ─────────────────────────────────────────────────────────

export class TransicionDeMesaInvalidaError extends DomainError {
  readonly code = 'SALES_TRANSICION_MESA_INVALIDA' as const;
  constructor(desde: string, hacia: string) {
    super(`Transición de mesa inválida: ${desde} → ${hacia}`);
  }
}

export class MesaYaOcupadaError extends DomainError {
  readonly code = 'SALES_MESA_YA_OCUPADA' as const;
  constructor() {
    super('La mesa ya tiene una comanda activa');
  }
}

// ── Comanda ──────────────────────────────────────────────────────

export class ComandaSinLineasError extends DomainError {
  readonly code = 'SALES_COMANDA_SIN_LINEAS' as const;
  constructor() {
    super('La comanda debe tener al menos una línea activa');
  }
}

export class ComandaNoModificableError extends DomainError {
  readonly code = 'SALES_COMANDA_NO_MODIFICABLE' as const;
  constructor(estado: string) {
    super(`No se pueden agregar líneas a una comanda en estado ${estado}`);
  }
}

export class TransicionDeComandaInvalidaError extends DomainError {
  readonly code = 'SALES_TRANSICION_COMANDA_INVALIDA' as const;
  constructor(desde: string, hacia: string) {
    super(`Transición de comanda inválida: ${desde} → ${hacia}`);
  }
}

export class LineaNoEncontradaError extends DomainError {
  readonly code = 'SALES_LINEA_NO_ENCONTRADA' as const;
  constructor(lineaId: string) {
    super(`Línea de comanda no encontrada: ${lineaId}`);
  }
}

export class CantidadDeLineaInvalidaError extends DomainError {
  readonly code = 'SALES_CANTIDAD_LINEA_INVALIDA' as const;
  constructor(cantidad: number) {
    super(`La cantidad por línea debe ser un entero positivo, se recibió: ${cantidad}`);
  }
}

export class CancelacionSinMotivoError extends DomainError {
  readonly code = 'SALES_CANCELACION_SIN_MOTIVO' as const;
  constructor() {
    super('La cancelación requiere un motivo');
  }
}

// ── Cobro ────────────────────────────────────────────────────────

export class CobrosIncompletosError extends DomainError {
  readonly code = 'SALES_COBRO_INCOMPLETO' as const;
  constructor(totalComanda: number, totalPagado: number) {
    super(
      `El total pagado ($${totalPagado}) es insuficiente para cubrir la comanda ($${totalComanda})`,
    );
  }
}

export class CobroYaProcesadoError extends DomainError {
  readonly code = 'SALES_COBRO_YA_PROCESADO' as const;
  constructor() {
    super('El cobro ya fue procesado');
  }
}

export class CobroNoAnulableError extends DomainError {
  readonly code = 'SALES_COBRO_NO_ANULABLE' as const;
  constructor(estado: string) {
    super(`No se puede anular un cobro en estado ${estado}`);
  }
}

export class PagosVaciosError extends DomainError {
  readonly code = 'SALES_PAGOS_VACIOS' as const;
  constructor() {
    super('Se requiere al menos un pago para procesar el cobro');
  }
}

// ── Factura ──────────────────────────────────────────────────────

export class FacturaYaAnuladaError extends DomainError {
  readonly code = 'SALES_FACTURA_YA_ANULADA' as const;
  constructor() {
    super('La factura ya fue anulada');
  }
}

export class NumeroFacturaInvalidoError extends DomainError {
  readonly code = 'SALES_NUMERO_FACTURA_INVALIDO' as const;
  constructor() {
    super('El número de factura no puede estar vacío');
  }
}

// ── Entidades no encontradas ─────────────────────────────────────

export class MesaNoEncontradaError extends DomainError {
  readonly code = 'SALES_MESA_NO_ENCONTRADA' as const;
  constructor(mesaId: string) {
    super(`Mesa no encontrada: ${mesaId}`);
  }
}

export class ComandaNoEncontradaError extends DomainError {
  readonly code = 'SALES_COMANDA_NO_ENCONTRADA' as const;
  constructor(comandaId: string) {
    super(`Comanda no encontrada: ${comandaId}`);
  }
}

export class CobroNoEncontradoError extends DomainError {
  readonly code = 'SALES_COBRO_NO_ENCONTRADO' as const;
  constructor(cobroId: string) {
    super(`Cobro no encontrado: ${cobroId}`);
  }
}

export class ProductoNoEncontradoError extends DomainError {
  readonly code = 'SALES_PRODUCTO_NO_ENCONTRADO' as const;
  constructor(varianteId: string) {
    super(`Producto no encontrado en catálogo: ${varianteId}`);
  }
}

export class ComandaNoListaError extends DomainError {
  readonly code = 'SALES_COMANDA_NO_LISTA' as const;
  constructor(estado: string) {
    super(`La comanda debe estar LISTA para cobrar, estado actual: ${estado}`);
  }
}

export class CobroNoProcesadoError extends DomainError {
  readonly code = 'SALES_COBRO_NO_PROCESADO' as const;
  constructor(estado: string) {
    super(`El cobro debe estar PROCESADO para emitir factura, estado: ${estado}`);
  }
}

export class MetodoDePagoInvalidoError extends DomainError {
  readonly code = 'SALES_METODO_DE_PAGO_INVALIDO' as const;
  constructor(metodo: string) {
    super(`Método de pago inválido: ${metodo}`);
  }
}

export type SalesDomainError =
  | IdInvalidoError
  | NombreMesaInvalidoError
  | MontoInvalidoError
  | MontoNegativoError
  | TasaIVAInvalidaError
  | TransicionDeMesaInvalidaError
  | MesaYaOcupadaError
  | ComandaSinLineasError
  | ComandaNoModificableError
  | TransicionDeComandaInvalidaError
  | LineaNoEncontradaError
  | CantidadDeLineaInvalidaError
  | CancelacionSinMotivoError
  | CobrosIncompletosError
  | CobroYaProcesadoError
  | CobroNoAnulableError
  | PagosVaciosError
  | FacturaYaAnuladaError
  | NumeroFacturaInvalidoError
  | MesaNoEncontradaError
  | ComandaNoEncontradaError
  | CobroNoEncontradoError
  | ProductoNoEncontradoError
  | ComandaNoListaError
  | CobroNoProcesadoError
  | MetodoDePagoInvalidoError;
