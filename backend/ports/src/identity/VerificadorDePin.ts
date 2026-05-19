import type { HashDePin, PinInvalidoError, Result } from '@zahavi/domain-identity';

/**
 * Puerto de salida para verificar y generar hashes de PIN numérico (autenticación en tablets).
 *
 * El PIN es la credencial de los `WORKER`. Se almacena siempre hasheado con bcrypt.
 */
export interface VerificadorDePin {
  /**
   * Compara un PIN en texto plano contra su hash bcrypt almacenado.
   * @param plano - PIN sin hashear proporcionado por el usuario.
   * @param hash - Hash bcrypt almacenado en la DB.
   * @returns `true` si coinciden.
   */
  verificar(plano: string, hash: HashDePin): Promise<boolean>;

  /**
   * Genera el hash bcrypt de un PIN en texto plano.
   * @param plano - PIN numérico a hashear (4-8 dígitos).
   * @returns `HashDePin` listo para persistir.
   */
  hashear(plano: string): Promise<HashDePin>;

  /**
   * Valida el formato del PIN (longitud, solo dígitos) sin hashear.
   * @returns `ok(void)` si es válido; `err(PinInvalidoError)` si no.
   */
  validarFormato(plano: string): Result<void, PinInvalidoError>;
}
