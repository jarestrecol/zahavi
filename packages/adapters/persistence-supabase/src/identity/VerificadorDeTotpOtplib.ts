import { authenticator } from 'otplib';
import { SecretoTotp } from '@zahavi/domain-identity';
import type { CodigoTotp, FechaHora, Email } from '@zahavi/domain-identity';
import type { VerificadorDeTotp } from '@zahavi/ports';

export class VerificadorDeTotpOtplib implements VerificadorDeTotp {
  async verificar(codigo: CodigoTotp, secreto: SecretoTotp, ahora: FechaHora): Promise<boolean> {
    const savedOptions = authenticator.options;
    authenticator.options = { ...savedOptions, epoch: ahora.toTimestamp() };
    try {
      return authenticator.check(codigo._unsafeRead(), secreto._unsafeRead());
    } finally {
      authenticator.options = savedOptions;
    }
  }

  async generarSecreto(): Promise<SecretoTotp> {
    const secret = authenticator.generateSecret(20);
    return SecretoTotp.de(secret);
  }

  urlDeEnrolamiento(secreto: SecretoTotp, email: Email): string {
    return authenticator.keyuri(email.toString(), 'Zahavi', secreto._unsafeRead());
  }
}
