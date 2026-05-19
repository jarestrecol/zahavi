import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { EstadoDeMesa } from '@zahavi/domain-sales';
import type { SalesComposition } from '../../composition/sales.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import {
  uuidParam,
  configurarMesaSchema,
  abrirAdHocSchema,
  crearComandaSchema,
  agregarLineaSchema,
  procesarCobroSchema,
  emitirFacturaSchema,
  listarMesasQuerySchema,
} from './schemas.js';

export interface SalesRouteOptions {
  composition: SalesComposition;
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

const salesRoutes: FastifyPluginAsync<SalesRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── GET /mesas ─────────────────────────────────────────────────────────────
  fastify.route({
    method: 'GET',
    url: '/mesas',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const query = listarMesasQuerySchema.parse(request.query);
      const result = await composition.listarMesas.execute(
        {
          puntoDeVentaId,
          ...(query.estado && { estado: query.estado as EstadoDeMesa }),
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /mesas ─────────────────────────────────────────────────────────────
  // Configura una mesa del catálogo (ADMIN)
  fastify.route({
    method: 'POST',
    url: '/mesas',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const body = configurarMesaSchema.parse(request.body);
      const result = await composition.configurarMesa.execute(
        { nombre: body.nombre, puntoDeVentaId },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /mesas/adhoc ───────────────────────────────────────────────────────
  // Abre una mesa ad-hoc (mesero)
  fastify.route({
    method: 'POST',
    url: '/mesas/adhoc',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const body = abrirAdHocSchema.parse(request.body);
      const result = await composition.abrirMesaAdHoc.execute(
        { nombre: body.nombre, puntoDeVentaId },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /comandas ─────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/comandas',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const body = crearComandaSchema.parse(request.body);
      const result = await composition.crearComanda.execute(
        { mesaId: body.mesaId, puntoDeVentaId, tomadaPor: request.user.sub },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /comandas/:id/lineas ──────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/comandas/:id/lineas',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const comandaId = uuidParam.parse((request.params as { id: string }).id);
      const body = agregarLineaSchema.parse(request.body);
      const result = await composition.agregarLinea.execute(
        { comandaId, varianteId: body.varianteId, cantidad: body.cantidad },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── DELETE /comandas/:id/lineas/:lineaId ───────────────────────────────────
  fastify.route({
    method: 'DELETE',
    url: '/comandas/:id/lineas/:lineaId',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const { id, lineaId } = request.params as { id: string; lineaId: string };
      const result = await composition.cancelarLinea.execute(
        { comandaId: uuidParam.parse(id), lineaId: uuidParam.parse(lineaId) },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /comandas/:id/enviar ──────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/comandas/:id/enviar',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const comandaId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.enviarComanda.execute({ comandaId }, request.id);
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /comandas/:id/preparacion ────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/comandas/:id/preparacion',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const comandaId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.marcarEnPreparacion.execute({ comandaId }, request.id);
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /comandas/:id/lista ───────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/comandas/:id/lista',
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const comandaId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.marcarLista.execute({ comandaId }, request.id);
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /cobros ───────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/cobros',
    config: {
      rateLimit: {
        max: process.env['NODE_ENV'] === 'test' ? 10_000 : 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const body = procesarCobroSchema.parse(request.body);
      const result = await composition.procesarCobro.execute(
        {
          comandaId: body.comandaId,
          puntoDeVentaId,
          cobradoPor: request.user.sub,
          pagos: body.pagos,
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /facturas ─────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/facturas',
    config: {
      rateLimit: {
        max: process.env['NODE_ENV'] === 'test' ? 10_000 : 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const puntoDeVentaId = getBuId(request, reply);
      if (!puntoDeVentaId) return;
      const body = emitirFacturaSchema.parse(request.body);
      const result = await composition.emitirFactura.execute(
        { cobroId: body.cobroId, puntoDeVentaId },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });
};

export default salesRoutes;
