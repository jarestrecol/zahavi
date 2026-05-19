/**
 * Value Object que representa un instante en el tiempo.
 *
 * Internamente almacena milisegundos Unix para evitar depender de `Date` mutable.
 * Inmutable: todas las operaciones devuelven nuevas instancias o primitivos.
 */
export class FechaHora {
  private constructor(private readonly _ms: number) {}

  /**
   * Construye una FechaHora desde un timestamp en milisegundos.
   * @param ms - Milisegundos Unix (Number.isFinite requerido).
   * @throws {Error} Si `ms` no es un número finito.
   */
  static deTimestamp(ms: number): FechaHora {
    if (!Number.isFinite(ms)) throw new Error('FechaHora: timestamp inválido');
    return new FechaHora(ms);
  }

  /** Construye una FechaHora con el instante actual (`Date.now()`). */
  static ahora(): FechaHora {
    return new FechaHora(Date.now());
  }

  /** Devuelve el timestamp en milisegundos Unix. */
  toTimestamp(): number {
    return this._ms;
  }

  /** Retorna `true` si este instante es anterior a `other`. */
  isBefore(other: FechaHora): boolean {
    return this._ms < other._ms;
  }

  /** Retorna `true` si este instante es posterior a `other`. */
  isAfter(other: FechaHora): boolean {
    return this._ms > other._ms;
  }

  /** Igualdad por valor (mismos milisegundos). */
  equals(other: FechaHora): boolean {
    return this._ms === other._ms;
  }

  /** Devuelve la representación ISO 8601 del instante. */
  toISOString(): string {
    return new Date(this._ms).toISOString();
  }
}
