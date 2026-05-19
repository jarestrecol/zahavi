/**
 * Value Object que representa un intervalo de tiempo (duración), expresado internamente en milisegundos.
 *
 * Usado en `PoliticaDeSesion` para definir TTL de sesión y tope absoluto. Inmutable.
 */
export class Duracion {
  private constructor(private readonly _ms: number) {}

  /** Construye una duración de `min` minutos. */
  static deMinutos(min: number): Duracion {
    return new Duracion(min * 60_000);
  }

  /** Construye una duración de `h` horas. */
  static deHoras(h: number): Duracion {
    return new Duracion(h * 3_600_000);
  }

  /** Construye una duración de `s` segundos. */
  static deSegundos(s: number): Duracion {
    return new Duracion(s * 1_000);
  }

  /** Devuelve la duración en milisegundos. */
  toMs(): number {
    return this._ms;
  }

  /** Igualdad por valor. */
  equals(other: Duracion): boolean {
    return this._ms === other._ms;
  }

  /** Retorna `true` si esta duración es mayor que `other`. */
  esMayorQue(other: Duracion): boolean {
    return this._ms > other._ms;
  }
}
