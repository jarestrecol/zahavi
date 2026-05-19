/** Error de infraestructura: el repositorio no pudo completar la operación (BD caída, timeout, etc.). */
export class RepositorioNoDisponibleError extends Error {
  readonly code = 'REPOSITORIO_NO_DISPONIBLE' as const;
  /** @param cause - Error original de la capa de persistencia (pg, Kysely, etc.). */
  constructor(cause?: unknown) {
    super('Repositorio no disponible');
    this.name = 'RepositorioNoDisponibleError';
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Error de concurrencia optimista: el aggregate fue modificado por otra operación. */
export class ConflictoDeVersionError extends Error {
  readonly code = 'CONFLICTO_DE_VERSION' as const;
  /** @param aggregateId - ID del aggregate en conflicto. */
  constructor(aggregateId: string) {
    super(`Conflicto de versión en aggregate "${aggregateId}"`);
    this.name = 'ConflictoDeVersionError';
  }
}
