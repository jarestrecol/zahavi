import { test, expect } from '@playwright/test';
import {
  seedAndClean,
  generateSaTotp,
  SA_EMAIL,
  SA_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  WORKER_EMAIL,
  WORKER_PIN,
  DEVICE_ID,
} from './helpers/seed.js';

test.beforeAll(async () => {
  await seedAndClean();
});

// ── Flujo RBAC completo ────────────────────────────────────────────────────

test('RBAC: SUPERADMIN crea ADMIN → ADMIN crea WORKER → WORKER sin acceso administrativo', async ({
  request,
}) => {
  // 1. SUPERADMIN inicia sesión (requiere TOTP porque lo tiene enrolado)
  const loginSA = await request.post('/api/identity/sesiones', {
    data: {
      tipo: 'navegador',
      email: SA_EMAIL,
      contrasenaEnClaro: SA_PASSWORD,
      codigoTotp: generateSaTotp(),
    },
  });
  expect(loginSA.status()).toBe(201);
  const saToken: string = (await loginSA.json()).token;
  expect(saToken).toBeTruthy();

  // 2. SUPERADMIN crea ADMIN (navegador, sin TOTP — será opcional para ADMIN)
  const createAdmin = await request.post('/api/identity/usuarios', {
    headers: { Authorization: `Bearer ${saToken}` },
    data: {
      email: ADMIN_EMAIL,
      nombreCompleto: 'Admin E2E',
      rol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: ADMIN_PASSWORD,
    },
  });
  expect(createAdmin.status()).toBe(201);
  const { usuarioId: adminId } = await createAdmin.json();
  expect(adminId).toBeTruthy();

  // 3. ADMIN inicia sesión sin TOTP (no lo tiene enrolado aún)
  const loginAdmin = await request.post('/api/identity/sesiones', {
    data: {
      tipo: 'navegador',
      email: ADMIN_EMAIL,
      contrasenaEnClaro: ADMIN_PASSWORD,
      // Sin codigoTotp — ADMIN sin TOTP debe poder iniciar sesión
    },
  });
  expect(loginAdmin.status()).toBe(201);
  const adminToken: string = (await loginAdmin.json()).token;

  // 4. ADMIN crea WORKER (tablet)
  const createWorker = await request.post('/api/identity/usuarios', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      email: WORKER_EMAIL,
      nombreCompleto: 'Worker E2E',
      rol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: WORKER_PIN,
    },
  });
  expect(createWorker.status()).toBe(201);

  // 5. WORKER inicia sesión con dispositivo autorizado
  const loginWorker = await request.post('/api/identity/sesiones', {
    data: {
      tipo: 'tablet',
      email: WORKER_EMAIL,
      dispositivoId: DEVICE_ID,
      pinEnClaro: WORKER_PIN,
    },
  });
  expect(loginWorker.status()).toBe(201);
  const workerToken: string = (await loginWorker.json()).token;

  // 6. WORKER no puede crear usuarios → 403
  const workerCreateUser = await request.post('/api/identity/usuarios', {
    headers: { Authorization: `Bearer ${workerToken}` },
    data: {
      email: 'otro@zahavi.test',
      nombreCompleto: 'Intruso',
      rol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: '000000',
    },
  });
  expect(workerCreateUser.status()).toBe(403);

  // 7. WORKER no puede revocar sesiones → 403
  const fakeSesionId = '00000000-0000-0000-0000-000000000099';
  const workerRevoke = await request.delete(`/api/identity/sesiones/${fakeSesionId}`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  expect(workerRevoke.status()).toBe(403);
});

// ── Casos de seguridad ────────────────────────────────────────────────────

test('login con credenciales inválidas → 401', async ({ request }) => {
  const res = await request.post('/api/identity/sesiones', {
    data: {
      tipo: 'navegador',
      email: 'noexiste@zahavi.test',
      contrasenaEnClaro: 'wrongpassword',
    },
  });
  expect(res.status()).toBe(401);
});

test('endpoint protegido sin Authorization → 401', async ({ request }) => {
  const res = await request.post('/api/identity/usuarios', {
    data: { email: 'x@zahavi.test' },
  });
  expect(res.status()).toBe(401);
});

test('endpoint protegido con token inválido → 401', async ({ request }) => {
  const res = await request.post('/api/identity/usuarios', {
    headers: { Authorization: 'Bearer token-falso' },
    data: {
      email: 'x@zahavi.test',
      nombreCompleto: 'X',
      rol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: '000000',
    },
  });
  expect(res.status()).toBe(401);
});

test('health endpoint público → 200', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});
