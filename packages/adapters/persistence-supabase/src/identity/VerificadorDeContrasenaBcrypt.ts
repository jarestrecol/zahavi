import bcrypt from 'bcryptjs';
import { ContrasenaEnClaro, HashDeContrasena, ok, type Result } from '@zahavi/domain-identity';
import type { ContrasenaDebilError } from '@zahavi/domain-identity';
import type { VerificadorDeContrasena } from '@zahavi/ports';

const SALT_ROUNDS = 12;

export class VerificadorDeContrasenaBcrypt implements VerificadorDeContrasena {
  async verificar(plano: string, hash: HashDeContrasena): Promise<boolean> {
    return bcrypt.compare(plano, hash.toString());
  }

  async hashear(plano: string): Promise<HashDeContrasena> {
    const hash = await bcrypt.hash(plano, SALT_ROUNDS);
    return HashDeContrasena.deCadenaYaHasheada(hash);
  }

  validarPolitica(plano: string): Result<void, ContrasenaDebilError> {
    const resultado = ContrasenaEnClaro.of(plano);
    if (!resultado.ok) return resultado;
    return ok(undefined);
  }
}
