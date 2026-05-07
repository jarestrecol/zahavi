import type { HashDePin, PinInvalidoError, Result } from '@zahavi/domain-identity';

export interface VerificadorDePin {
  verificar(plano: string, hash: HashDePin): Promise<boolean>;
  hashear(plano: string): Promise<HashDePin>;
  validarFormato(plano: string): Result<void, PinInvalidoError>;
}
