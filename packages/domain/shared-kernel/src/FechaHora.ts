export class FechaHora {
  private constructor(private readonly _ms: number) {}

  static deTimestamp(ms: number): FechaHora {
    if (!Number.isFinite(ms)) throw new Error('FechaHora: timestamp inválido');
    return new FechaHora(ms);
  }

  static ahora(): FechaHora {
    return new FechaHora(Date.now());
  }

  toTimestamp(): number {
    return this._ms;
  }

  isBefore(other: FechaHora): boolean {
    return this._ms < other._ms;
  }

  isAfter(other: FechaHora): boolean {
    return this._ms > other._ms;
  }

  equals(other: FechaHora): boolean {
    return this._ms === other._ms;
  }

  toISOString(): string {
    return new Date(this._ms).toISOString();
  }
}
