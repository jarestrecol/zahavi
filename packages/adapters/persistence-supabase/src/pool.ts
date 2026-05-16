import { Pool } from 'pg';

/**
 * Crea el pool de conexiones compartido para todos los adapters de la aplicación.
 * Un solo pool evita que cada BC abra su propio conjunto de conexiones (D-018).
 *
 * El pool se configura con límites conservadores para el plan Free de Supabase
 * (máx. 20-25 conexiones directas). Se reserva 1 conexión para el health check.
 */
function stripSslParams(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('ssl');
  return parsed.toString();
}

export function createSharedPool(databaseUrl: string): Pool {
  const isProd = process.env['NODE_ENV'] === 'production';
  return new Pool({
    connectionString: isProd ? stripSslParams(databaseUrl) : databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: isProd ? { rejectUnauthorized: false } : undefined,
  });
}
