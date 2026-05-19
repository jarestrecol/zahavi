export class Duracion {
  private constructor(private readonly _ms: number) {}

  static deMinutos(min: number): Duracion {
    return new Duracion(min * 60_000);
  }

  static deHoras(h: number): Duracion {
    return new Duracion(h * 3_600_000);
  }

  static deSegundos(s: number): Duracion {
    return new Duracion(s * 1_000);
  }

  toMs(): number {
    return this._ms;
  }

  equals(other: Duracion): boolean {
    return this._ms === other._ms;
  }

  esMayorQue(other: Duracion): boolean {
    return this._ms > other._ms;
  }
}
