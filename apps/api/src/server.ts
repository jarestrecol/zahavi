import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwtPlugin from './plugins/jwt.js';
import { errorHandler } from './plugins/error-handler.js';
import identityRoutes from './routes/identity/index.js';
import type { Env } from './env.js';
import type { IdentityComposition } from './composition/identity.js';

export function buildServer(env: Env, composition: IdentityComposition) {
  const fastify = Fastify({
    // HIGH-3: limitar body a 16 KB — auth endpoints solo necesitan email+password+TOTP
    bodyLimit: 16 * 1024,
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
        // Secretos TOTP en response (defensa en profundidad)
        'body.secretoBase32',
        'body.otpAuthUrl',
      ],
    },
    // MED-2: un solo salto confiable (load balancer directo)
    // En producción ajustar al CIDR del LB/proxy
    trustProxy: 1,
  });

  fastify.register(helmet);

  fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });

  // Rate limit global — las rutas auth tienen su propio límite más estricto
  fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  });

  fastify.register(jwtPlugin, { jwtSecret: env.JWT_SECRET });

  fastify.setErrorHandler(errorHandler);

  fastify.register(identityRoutes, { prefix: '/api/identity', composition });

  fastify.get('/health', async () => ({ ok: true }));

  return fastify;
}
