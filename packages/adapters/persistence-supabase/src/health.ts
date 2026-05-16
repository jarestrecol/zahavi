import { Pool } from 'pg';

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
}

/**
 * Crea una función de chequeo de conectividad con la base de datos.
 * Usa un pool mínimo (1 conexión) exclusivo para health checks.
 */
export function createHealthCheck(databaseUrl: string): () => Promise<HealthCheckResult> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10_000,
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  return async (): Promise<HealthCheckResult> => {
    const inicio = Date.now();
    try {
      await pool.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - inicio };
    } catch {
      return { ok: false, latencyMs: Date.now() - inicio };
    }
  };
}
