import crypto from 'node:crypto';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwtPlugin from './plugins/jwt.js';
import auditPlugin from './plugins/audit.js';
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
import type { HealthCheckResult } from '@zahavi/adapter-persistence-supabase';
import type { IAuditLogger } from '@zahavi/ports';

export function buildServer(
  env: Env,
  identityComposition: IdentityComposition,
  catalogComposition: CatalogComposition,
  inventoryComposition: InventoryComposition,
  productionComposition: ProductionComposition,
  salesComposition: SalesComposition,
  reportingComposition: ReportingComposition,
  checkDb: () => Promise<HealthCheckResult>,
  auditLogger: IAuditLogger,
) {
  const isProd = env.NODE_ENV === 'production';

  const fastify = Fastify({
    // HIGH-3: limitar body a 64 KB — aceptamos recetas y combos con varias líneas
    bodyLimit: 64 * 1024,
    // HIGH-3: timeouts para evitar Slowloris y requests colgados
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
    // Request ID único por petición — propagado en X-Request-Id para trazabilidad
    genReqId: () => crypto.randomUUID(),
    logger: {
      level: isProd ? 'info' : 'debug',
      // Producción: JSON estructurado con timestamp ISO — ingestado por Datadog/Grafana
      // Desarrollo: pino-pretty para legibilidad en consola
      ...(isProd
        ? { timestamp: () => `,"time":"${new Date().toISOString()}"` }
        : {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
            },
          }),
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

  // Rate limit global (desactivado en test para no bloquear suites E2E)
  fastify.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === 'test' ? 10_000 : 200,
    timeWindow: '1 minute',
  });

  // Propagar request ID en la respuesta — permite al cliente y al load balancer correlacionar logs
  fastify.addHook('onSend', async (_request, reply) => {
    void reply.header('X-Request-Id', _request.id);
  });

  fastify.register(jwtPlugin, { jwtSecret: env.JWT_SECRET });
  fastify.register(auditPlugin, { auditLogger });

  fastify.setErrorHandler(errorHandler);

  fastify.register(identityRoutes, { prefix: '/identity', composition: identityComposition });
  fastify.register(catalogRoutes, { prefix: '/catalog', composition: catalogComposition });
  fastify.register(inventoryRoutes, {
    prefix: '/inventory',
    composition: inventoryComposition,
  });
  fastify.register(productionRoutes, {
    prefix: '/production',
    composition: productionComposition,
  });

  fastify.register(salesRoutes, {
    prefix: '/sales',
    composition: salesComposition,
  });

  fastify.register(reportingRoutes, {
    prefix: '/reporting',
    composition: reportingComposition,
  });

  fastify.get('/health', async () => ({ ok: true }));

  // /health/ready — verifica conectividad con la DB. Usado por load balancers y alertas.
  fastify.get('/health/ready', async (_request, reply) => {
    const result = await checkDb();
    if (!result.ok) {
      return reply.code(503).send({ ok: false, db: false, latencyMs: result.latencyMs });
    }
    return { ok: true, db: true, latencyMs: result.latencyMs };
  });

  return fastify;
}
