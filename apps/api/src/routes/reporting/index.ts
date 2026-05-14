import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { ReportingComposition } from '../../composition/reporting.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import { dashboardQuerySchema, cierreQuerySchema } from './schemas.js';

export interface ReportingRouteOptions {
  composition: ReportingComposition;
}

function getBuId(request: FastifyRequest, reply: FastifyReply): string | null {
  const buId = request.user.bu_id;
  if (!buId) {
    void reply.code(403).send({
      code: 'ERR_AUTH_NO_BU',
      message: 'El usuario no tiene unidad de negocio asignada en el token.',
    });
    return null;
  }
  return buId;
}

const reportingRoutes: FastifyPluginAsync<ReportingRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── GET /dashboard ──────────────────────────────────────────────────────────
  // KPIs del día. Accesible para ADMIN y SUPERADMIN.
  fastify.route({
    method: 'GET',
    url: '/dashboard',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const query = dashboardQuerySchema.parse(request.query);
      const result = await composition.consultarDashboard.execute({
        puntoDeVentaId,
        ...(query.fecha !== undefined && { fecha: query.fecha }),
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── GET /cierre-de-caja ──────────────────────────────────────────────────────
  // Cierre de caja por rango de fechas. Solo ADMIN y SUPERADMIN.
  fastify.route({
    method: 'GET',
    url: '/cierre-de-caja',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const query = cierreQuerySchema.parse(request.query);
      const result = await composition.consultarCierreDeCaja.execute({
        puntoDeVentaId,
        desde: query.desde,
        hasta: query.hasta,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });
};

export default reportingRoutes;
