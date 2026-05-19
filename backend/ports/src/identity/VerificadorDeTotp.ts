import type { CodigoTotp, SecretoTotp, FechaHora, Email } from '@zahavi/domain-identity';

/**
 * Puerto de salida para verificar y generar secretos TOTP (segundo factor de autenticación).
 *
 * Obligatorio para `SUPERADMIN`; opcional para `ADMIN`. No aplicable a `WORKER`.
 */
export interface VerificadorDeTotp {
  /**
   * Verifica un código TOTP de 6 dígitos contra el secreto del usuario.
   * @param codigo - Código TOTP proporcionado por el autenticador del usuario.
   * @param secreto - Secreto TOTP almacenado para el usuario.
   * @param ahora - Instante actual; permite ventana de ±30 s para desfases de reloj.
   * @returns `true` si el código es válido en la ventana temporal.
   */
  verificar(codigo: CodigoTotp, secreto: SecretoTotp, ahora: FechaHora): Promise<boolean>;

  /**
   * Genera un secreto TOTP aleatorio y seguro para enrolar un nuevo usuario.
   * @returns Secreto codificado en Base32 listo para almacenar.
   */
  generarSecreto(): Promise<SecretoTotp>;

  /**
   * Genera la URL `otpauth://` para mostrar como QR en la pantalla de enrolamiento.
   * @param secreto - Secreto TOTP del usuario.
   * @param email - Email del usuario, usado como label en la app autenticadora.
   * @returns URL compatible con Google Authenticator, Authy, etc.
   */
  urlDeEnrolamiento(secreto: SecretoTotp, email: Email): string;
}
