import { DomainError } from './DomainError.js';

export class MoneyInvalidoError extends DomainError {
  readonly code = 'SHARED_MONEY_INVALIDO';
  constructor(razon: string) {
    super(`Monto inválido: ${razon}`);
  }
}
