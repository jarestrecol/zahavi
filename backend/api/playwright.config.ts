import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// El proceso del servidor recibe .env.test via --env-file.
// El proceso de Playwright (donde corre seedAndClean) lo necesita también.
process.env['NODE_ENV'] = 'test';
try {
  const raw = readFileSync(join(import.meta.dirname, '.env.test'), 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    // indexOf encuentra el primer '='; slice(eqIdx+1) preserva cualquier '=' en el valor
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // En CI las variables vienen de secretos — .env.test no existe
}

export default defineConfig({
  testDir: '../../qa/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'pnpm exec tsx --env-file .env.test src/index.ts',
    url: 'http://localhost:3001/health',
    reuseExistingServer: !process.env['CI'],
    timeout: 20_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  // Secuencial: los tests comparten estado de DB
  workers: 1,
  reporter: 'line',
});
