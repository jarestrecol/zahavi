import type { FastifyPluginAsync } from 'fastify';
import type { IdentityComposition } from '../../composition/identity.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import {
  uuidParam,
  registrarUsuarioSchema,
  asignarRolSchema,
  iniciarSesionSchema,
  confirmarTotpSchema,
  cambiarContextoSchema,
} from './schemas.js';

export interface IdentityRouteOptions {
  composition: IdentityComposition;
}

const MAX_TTL_SECONDS = 86_400; // 24h tope absoluto de seguridad

const identityRoutes: FastifyPluginAsync<IdentityRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── POST /sesiones — IniciarSesion (público, rate-limit estricto) ──────────
  fastify.route({
    method: 'POST',
    url: '/sesiones',
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    handler: async (request, reply) => {
      const body = iniciarSesionSchema.parse(request.body);
      const result = await composition.iniciarSesion.execute(body);
      if (!result.ok) throw result.error;

      const ttlSeconds = Math.min(
        MAX_TTL_SECONDS,
        Math.max(1, Math.floor((result.value.expiraEnAbsolutoMs - Date.now()) / 1000)),
      );
      // HIGH-2: iss ya viene del plugin; expiresIn anula el de la política de sesión si necesario
      const token = fastify.jwt.sign(
        {
          sub: result.value.usuarioId,
          sesion_id: result.value.sesionId,
          zahavi_rol: result.value.rol,
          bu_id: result.value.businessUnitId,
        },
        { expiresIn: ttlSeconds },
      );

      return reply.code(201).send({
        token,
        sesionId: result.value.sesionId,
        usuarioId: result.value.usuarioId,
        rol: result.value.rol,
        dispositivoId: result.value.dispositivoId,
        expiraEnAbsolutoMs: result.value.expiraEnAbsolutoMs,
      });
    },
  });

  // ── POST /sesiones/:id/cerrar — CerrarSesion (propietario) ──────────────
  fastify.route({
    method: 'POST',
    url: '/sesiones/:id/cerrar',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      // MED-4: validar que :id sea UUID antes de pasarlo al dominio
      const id = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.cerrarSesion.execute({
        sesionId: id,
        usuarioId: request.user.sub,
      });
      if (!result.ok) throw result.error;
      return reply.code(204).send();
    },
  });

  // ── DELETE /sesiones/:id — RevocarSesion (ADMIN / SUPERADMIN) ───────────
  fastify.route({
    method: 'DELETE',
    url: '/sesiones/:id',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const id = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.revocarSesion.execute({
        actorId: request.user.sub,
        actorRol: request.user.zahavi_rol,
        sesionId: id,
      });
      if (!result.ok) throw result.error;
      return reply.code(204).send();
    },
  });

  // ── POST /usuarios — RegistrarUsuario (SUPERADMIN / ADMIN) ──────────────
  fastify.route({
    method: 'POST',
    url: '/usuarios',
    preHandler: [authenticate, requireRole('SUPERADMIN', 'ADMIN')],
    handler: async (request, reply) => {
      const body = registrarUsuarioSchema.parse(request.body);
      const result = await composition.registrarUsuario.execute({
        ...body,
        // actorId y actorRol siempre vienen del JWT — nunca del body del cliente
        actorId: request.user.sub,
        actorRol: request.user.zahavi_rol,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── PUT /usuarios/:id/rol — AsignarRol (SUPERADMIN / ADMIN) ─────────────
  fastify.route({
    method: 'PUT',
    url: '/usuarios/:id/rol',
    preHandler: [authenticate, requireRole('SUPERADMIN', 'ADMIN')],
    handler: async (request, reply) => {
      const id = uuidParam.parse((request.params as { id: string }).id);
      const body = asignarRolSchema.parse(request.body);
      const result = await composition.asignarRol.execute({
        actorId: request.user.sub,
        actorRol: request.user.zahavi_rol,
        usuarioObjetivoId: id,
        ...body,
      });
      if (!result.ok) throw result.error;
      return reply.code(204).send();
    },
  });

  // ── POST /totp/iniciar — IniciarEnrolamientoTotp (usuario autenticado) ──
  fastify.route({
    method: 'POST',
    url: '/totp/iniciar',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const result = await composition.iniciarEnrolamientoTotp.execute({
        usuarioId: request.user.sub,
      });
      if (!result.ok) throw result.error;
      // CRIT-1: secretoBase32 y otpAuthUrl se envían una sola vez vía HTTPS.
      // Están redactados en logs (server.ts redact config).
      // El cliente debe mostrarlos al usuario y no almacenarlos en estado persistente.
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /totp/confirmar — ConfirmarTotp (usuario autenticado) ──────────
  fastify.route({
    method: 'POST',
    url: '/totp/confirmar',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const body = confirmarTotpSchema.parse(request.body);
      const result = await composition.confirmarTotp.execute({
        usuarioId: request.user.sub,
        codigoTotp: body.codigoTotp,
      });
      if (!result.ok) throw result.error;
      return reply.code(204).send();
    },
  });

  // ── POST /contexto/cambiar — CambiarContextoBusinessUnit (ADMIN / SUPERADMIN) ──
  fastify.route({
    method: 'POST',
    url: '/contexto/cambiar',
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = cambiarContextoSchema.parse(request.body);
      const result = await composition.cambiarContexto.execute({
        usuarioId: request.user.sub,
        nuevoBusinessUnitId: body.nuevoBusinessUnitId,
      });
      if (!result.ok) throw result.error;

      // Emitir JWT nuevo con bu_id actualizado; preservar el TTL residual del token original
      // para evitar "refresh implícito" por switch-context repetido.
      const { sub, sesion_id, zahavi_rol } = request.user;
      const originalExp = (request.user as unknown as { exp?: number }).exp;
      const ahora = Math.floor(Date.now() / 1000);
      const ttlResidual = originalExp ? Math.max(1, originalExp - ahora) : MAX_TTL_SECONDS;
      const token = fastify.jwt.sign(
        { sub, sesion_id, zahavi_rol, bu_id: result.value.businessUnitId },
        { expiresIn: Math.min(ttlResidual, MAX_TTL_SECONDS) },
      );

      return reply.code(200).send({ token, businessUnitId: result.value.businessUnitId });
    },
  });
};

export default identityRoutes;
