import { DomainError } from './DomainError.js';

/** Error de dominio emitido cuando un monto monetario viola las invariantes de `Money`. */
export class MoneyInvalidoError extends DomainError {
  readonly code = 'SHARED_MONEY_INVALIDO';
  /** @param razon - Descripción del motivo del rechazo (p. ej. "monto negativo"). */
  constructor(razon: string) {
    super(`Monto inválido: ${razon}`);
  }
}
