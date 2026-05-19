import type { CodigoTotp, SecretoTotp, FechaHora, Email } from '@zahavi/domain-identity';

export interface VerificadorDeTotp {
  verificar(codigo: CodigoTotp, secreto: SecretoTotp, ahora: FechaHora): Promise<boolean>;
  generarSecreto(): Promise<SecretoTotp>;
  urlDeEnrolamiento(secreto: SecretoTotp, email: Email): string;
}
