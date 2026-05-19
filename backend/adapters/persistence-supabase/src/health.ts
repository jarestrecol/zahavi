import { Pool } from 'pg';

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
}

/**
 * Crea una función de chequeo de conectividad con la base de datos.
 * Usa un pool mínimo (1 conexión) exclusivo para health checks.
 */
function stripSslParams(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('ssl');
  return parsed.toString();
}

export function createHealthCheck(databaseUrl: string): () => Promise<HealthCheckResult> {
  const isProd = process.env['NODE_ENV'] === 'production';
  const pool = new Pool({
    connectionString: isProd ? stripSslParams(databaseUrl) : databaseUrl,
    max: 1,
    idleTimeoutMillis: 10_000,
    ssl: isProd ? { rejectUnauthorized: false } : undefined,
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
