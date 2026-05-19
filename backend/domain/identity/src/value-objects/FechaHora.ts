/**
 * Value Object que representa un instante en el tiempo para el BC Identity.
 *
 * Versión local que extiende la del shared-kernel con métodos específicos de
 * cálculo de expiración de sesiones. Inmutable.
 */
export class FechaHora {
  private constructor(private readonly _ms: number) {}

  /**
   * Construye una FechaHora desde un timestamp en milisegundos.
   * @throws {Error} Si `ms` no es un número finito.
   */
  static deTimestamp(ms: number): FechaHora {
    if (!Number.isFinite(ms)) throw new Error('FechaHora: timestamp inválido');
    return new FechaHora(ms);
  }

  /** Construye una FechaHora con el instante actual. */
  static ahora(): FechaHora {
    return new FechaHora(Date.now());
  }

  /** Devuelve el timestamp en milisegundos Unix. */
  toTimestamp(): number {
    return this._ms;
  }

  /** `true` si este instante es anterior a `other`. */
  isBefore(other: FechaHora): boolean {
    return this._ms < other._ms;
  }

  /** `true` si este instante es posterior a `other`. */
  isAfter(other: FechaHora): boolean {
    return this._ms > other._ms;
  }

  /** Igualdad por valor. */
  equals(other: FechaHora): boolean {
    return this._ms === other._ms;
  }

  /**
   * Devuelve un nuevo instante desplazado `ms` milisegundos hacia el futuro.
   * Usado para calcular fechas de expiración de sesión.
   */
  masMillisegundos(ms: number): FechaHora {
    return new FechaHora(this._ms + ms);
  }

  /**
   * Diferencia en milisegundos entre este instante y `other` (`this - other`).
   * Positivo si `this` es posterior a `other`.
   */
  diferenciaEnMs(other: FechaHora): number {
    return this._ms - other._ms;
  }

  /** Representación ISO 8601 del instante. */
  toISOString(): string {
    return new Date(this._ms).toISOString();
  }
}
