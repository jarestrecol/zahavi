import type { HashDeContrasena, ContrasenaDebilError, Result } from '@zahavi/domain-identity';

export interface VerificadorDeContrasena {
  verificar(plano: string, hash: HashDeContrasena): Promise<boolean>;
  hashear(plano: string): Promise<HashDeContrasena>;
  validarPolitica(plano: string): Result<void, ContrasenaDebilError>;
}
