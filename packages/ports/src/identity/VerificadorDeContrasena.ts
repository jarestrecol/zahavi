import type { HashDeContrasena, ContrasenaDebilError, Result } from '@zahavi/domain-identity';

/** Puerto para hashing y verificación de contraseñas (implementado con bcryptjs). */
export interface VerificadorDeContrasena {
  /** `true` si `plano` coincide con el `hash` almacenado (bcrypt compare). */
  verificar(plano: string, hash: HashDeContrasena): Promise<boolean>;
  /** Genera el hash bcrypt de una contraseña en texto plano. */
  hashear(plano: string): Promise<HashDeContrasena>;
  /** Valida la política de complejidad (longitud, mayúsculas, números). No hace hashing. */
  validarPolitica(plano: string): Result<void, ContrasenaDebilError>;
}
