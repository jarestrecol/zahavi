import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwtPlugin from './plugins/jwt.js';
import { errorHandler } from './plugins/error-handler.js';
import identityRoutes from './routes/identity/index.js';
import catalogRoutes from './routes/catalog/index.js';
import inventoryRoutes from './routes/inventory/index.js';
import productionRoutes from './routes/production/index.js';
import salesRoutes from './routes/sales/index.js';
import reportingRoutes from './routes/reporting/index.js';
import type { Env } from './env.js';
import type { IdentityComposition } from './composition/identity.js';
import type { CatalogComposition } from './composition/catalog.js';
import type { InventoryComposition } from './composition/inventory.js';
import type { ProductionComposition } from './composition/production.js';
import type { SalesComposition } from './composition/sales.js';
import type { ReportingComposition } from './composition/reporting.js';

export function buildServer(
  env: Env,
  identityComposition: IdentityComposition,
  catalogComposition: CatalogComposition,
  inventoryComposition: InventoryComposition,
  productionComposition: ProductionComposition,
  salesComposition: SalesComposition,
  reportingComposition: ReportingComposition,
) {
  const fastify = Fastify({
    // HIGH-3: limitar body a 64 KB — aceptamos recetas y combos con varias líneas
    bodyLimit: 64 * 1024,
    // HIGH-3: timeouts para evitar Slowloris y requests colgados
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      // CRIT-1: redactar todos los campos sensibles en logs
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.contrasenaEnClaro',
        'body.pinEnClaro',
        'body.codigoTotp',
        'body.secretoBase32',
        'body.otpAuthUrl',
      ],
    },
    // MED-2: un solo salto confiable (load balancer directo)
    trustProxy: 1,
  });

  // HSTS explícito: 1 año, includeSubDomains, preload — requerido por CLAUDE.md §2.2
  fastify.register(helmet, {
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  });

  fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    // SEC: credentials=true solo cuando hay lista explícita de orígenes (no wildcard)
    credentials: env.CORS_ORIGIN !== '*',
  });

  // Rate limit global — las rutas auth tienen su propio límite más estricto
  fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  });

  fastify.register(jwtPlugin, { jwtSecret: env.JWT_SECRET });

  fastify.setErrorHandler(errorHandler);

  fastify.register(identityRoutes, { prefix: '/api/identity', composition: identityComposition });
  fastify.register(catalogRoutes, { prefix: '/api/catalog', composition: catalogComposition });
  fastify.register(inventoryRoutes, {
    prefix: '/api/inventory',
    composition: inventoryComposition,
  });
  fastify.register(productionRoutes, {
    prefix: '/api/production',
    composition: productionComposition,
  });

  fastify.register(salesRoutes, {
    prefix: '/api/sales',
    composition: salesComposition,
  });

  fastify.register(reportingRoutes, {
    prefix: '/api/reporting',
    composition: reportingComposition,
  });

  fastify.get('/health', async () => ({ ok: true }));

  return fastify;
}
