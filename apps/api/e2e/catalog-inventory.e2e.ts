import { test, expect } from '@playwright/test';
import {
  seedCatalogInventoryAndClean,
  generateSaTotp,
  SA_EMAIL,
  SA_PASSWORD,
  BU_ID,
  WORKER_EMAIL,
  WORKER_PIN,
  DEVICE_ID,
} from './helpers/seed.js';

let saToken: string;
let workerToken: string;
let categoriaId: string;

test.beforeAll(async ({ request }) => {
  await seedCatalogInventoryAndClean();

  // SA login (requiere TOTP)
  const loginSA = await request.post('/identity/sesiones', {
    data: {
      tipo: 'navegador',
      email: SA_EMAIL,
      contrasenaEnClaro: SA_PASSWORD,
      codigoTotp: generateSaTotp(),
    },
  });
  expect(loginSA.status()).toBe(201);
  saToken = (await loginSA.json()).token;
  expect(saToken).toBeTruthy();

  // Crear WORKER para pruebas de RBAC
  const createWorker = await request.post('/identity/usuarios', {
    headers: { Authorization: `Bearer ${saToken}` },
    data: {
      email: WORKER_EMAIL,
      nombreCompleto: 'Worker Catalog E2E',
      rol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: WORKER_PIN,
    },
  });
  expect(createWorker.status()).toBe(201);

  // WORKER login con dispositivo
  const loginWorker = await request.post('/identity/sesiones', {
    data: {
      tipo: 'tablet',
      email: WORKER_EMAIL,
      dispositivoId: DEVICE_ID,
      pinEnClaro: WORKER_PIN,
    },
  });
  expect(loginWorker.status()).toBe(201);
  workerToken = (await loginWorker.json()).token;
});

// ── Catalog: categorías ───────────────────────────────────────────────────────

test('SUPERADMIN crea una categoría → 201', async ({ request }) => {
  const res = await request.post('/catalog/categorias', {
    headers: { Authorization: `Bearer ${saToken}` },
    data: { nombre: 'Panadería E2E', padreId: null, orden: 0 },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.categoriaId).toBeTruthy();
  categoriaId = body.categoriaId as string;
});

test('WORKER no puede crear categoría → 403', async ({ request }) => {
  const res = await request.post('/catalog/categorias', {
    headers: { Authorization: `Bearer ${workerToken}` },
    data: { nombre: 'Intento WORKER' },
  });
  expect(res.status()).toBe(403);
});

// ── Catalog: productos ────────────────────────────────────────────────────────

test('SUPERADMIN crea un producto → 201', async ({ request }) => {
  const res = await request.post('/catalog/productos', {
    headers: { Authorization: `Bearer ${saToken}` },
    data: {
      nombre: 'Croissant Test E2E',
      categoriaId,
      varianteInicial: {
        nombre: 'Individual',
        precioCop: 4500,
      },
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.productoId ?? body.id).toBeTruthy();
});

test('GET /catalog/productos devuelve lista al SUPERADMIN → 200', async ({ request }) => {
  const res = await request.get('/catalog/productos', {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
});

test('GET /catalog/productos devuelve lista al WORKER → 200', async ({ request }) => {
  const res = await request.get('/catalog/productos', {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
});

test('GET /catalog/productos sin token → 401', async ({ request }) => {
  const res = await request.get('/catalog/productos');
  expect(res.status()).toBe(401);
});

test('GET /catalog/productos con búsqueda → filtra resultados', async ({ request }) => {
  const res = await request.get('/catalog/productos?search=Croissant+Test+E2E', {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
  // Al menos el producto creado en este suite debe aparecer
  const encontrado = (body.items as Array<{ nombre: string }>).some((p) =>
    p.nombre.includes('Croissant Test E2E'),
  );
  expect(encontrado).toBe(true);
});

// ── Inventory: ingredientes ───────────────────────────────────────────────────

test('SUPERADMIN crea un ingrediente → 201', async ({ request }) => {
  const res = await request.post('/inventory/ingredientes', {
    headers: { Authorization: `Bearer ${saToken}` },
    data: {
      nombre: 'Harina Test E2E',
      unidadNativa: 'kg',
      costoUnitarioCop: 2000,
      umbralDeAlerta: 5,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.ingredienteId).toBeTruthy();
});

test('WORKER no puede crear ingrediente → 403', async ({ request }) => {
  const res = await request.post('/inventory/ingredientes', {
    headers: { Authorization: `Bearer ${workerToken}` },
    data: {
      nombre: 'Agua Test',
      unidadNativa: 'L',
      costoUnitarioCop: 100,
    },
  });
  expect(res.status()).toBe(403);
});

// ── Inventory: stock ──────────────────────────────────────────────────────────

test('GET /inventory/stock requiere ADMIN o SUPERADMIN → WORKER recibe 403', async ({
  request,
}) => {
  const res = await request.get(`/inventory/stock?businessUnitId=${BU_ID}`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  expect(res.status()).toBe(403);
});

test('GET /inventory/stock sin token → 401', async ({ request }) => {
  const res = await request.get(`/inventory/stock?businessUnitId=${BU_ID}`);
  expect(res.status()).toBe(401);
});

test('GET /inventory/stock para SUPERADMIN → 200 con array', async ({ request }) => {
  const res = await request.get(`/inventory/stock?businessUnitId=${BU_ID}`, {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items ?? body)).toBe(true);
});
