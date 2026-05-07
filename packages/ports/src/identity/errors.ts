export class RepositorioNoDisponibleError extends Error {
  readonly code = 'REPOSITORIO_NO_DISPONIBLE' as const;
  constructor(cause?: unknown) {
    super('Repositorio no disponible');
    this.name = 'RepositorioNoDisponibleError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export class ConflictoDeVersionError extends Error {
  readonly code = 'CONFLICTO_DE_VERSION' as const;
  constructor(aggregateId: string) {
    super(`Conflicto de versión en aggregate "${aggregateId}"`);
    this.name = 'ConflictoDeVersionError';
  }
}
