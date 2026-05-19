import bcrypt from 'bcryptjs';
import { Pin, HashDePin, ok, type Result } from '@zahavi/domain-identity';
import type { PinInvalidoError } from '@zahavi/domain-identity';
import type { VerificadorDePin } from '@zahavi/ports';

const SALT_ROUNDS = 10;

export class VerificadorDePinBcrypt implements VerificadorDePin {
  async verificar(plano: string, hash: HashDePin): Promise<boolean> {
    return bcrypt.compare(plano, hash.toString());
  }

  async hashear(plano: string): Promise<HashDePin> {
    const hash = await bcrypt.hash(plano, SALT_ROUNDS);
    return HashDePin.deCadenaYaHasheada(hash);
  }

  validarFormato(plano: string): Result<void, PinInvalidoError> {
    const resultado = Pin.of(plano);
    if (!resultado.ok) return resultado;
    return ok(undefined);
  }
}
