import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { Rol } from '@zahavi/domain-identity';

export interface JwtPayload {
  sub: string;
  sesion_id: string;
  zahavi_rol: Rol;
  /** UUID de la unidad de negocio activa. null para SUPERADMIN sin contexto fijado. */
  bu_id: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

interface JwtPluginOptions {
  jwtSecret: string;
}

const jwtPlugin: FastifyPluginAsync<JwtPluginOptions> = async (fastify, opts) => {
  await fastify.register(fastifyJwt, {
    secret: opts.jwtSecret,
    // HIGH-2: fijar algoritmo (fast-jwt usa 'iss', no 'issuer'; 'algorithm' singular en sign)
    sign: { algorithm: 'HS256', iss: 'zahavi-api' },
    verify: { algorithms: ['HS256'], allowedIss: 'zahavi-api' },
  });
};

export default fp(jwtPlugin, { name: 'zahavi-jwt' });

// ── Prehandlers reutilizables ────────────────────────────────────

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    // HIGH-1: loguear solo el tipo de error, sin detalles que filtren implementación
    request.log.warn({ jwtError: (err as Error).name }, 'JWT verify falló');
    // HIGH-1: retornar explícitamente para cortar la cadena de preHandlers
    return reply
      .code(401)
      .send({ error: 'NO_AUTORIZADO', mensaje: 'Token JWT inválido o ausente' });
  }
}

export function requireRole(...roles: Rol[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!roles.includes(request.user.zahavi_rol)) {
      // HIGH-1: retornar explícitamente
      return reply
        .code(403)
        .send({ error: 'ACCESO_DENEGADO', mensaje: `Se requiere rol: ${roles.join(' o ')}` });
    }
  };
}
