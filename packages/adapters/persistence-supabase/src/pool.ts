import { Pool } from 'pg';

/**
 * Crea el pool de conexiones compartido para todos los adapters de la aplicación.
 * Un solo pool evita que cada BC abra su propio conjunto de conexiones (D-018).
 *
 * El pool se configura con límites conservadores para el plan Free de Supabase
 * (máx. 20-25 conexiones directas). Se reserva 1 conexión para el health check.
 */
export function createSharedPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : undefined,
  });
}
