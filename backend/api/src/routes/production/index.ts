import type { FastifyPluginAsync } from 'fastify';
import type { EstadoDeOrdenDeProduccion } from '@zahavi/domain-production';
import type { ProductionComposition } from '../../composition/production.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import {
  uuidParam,
  crearOrdenSchema,
  calcularBOMSchema,
  registrarMermaSchema,
  ejecutarOrdenSchema,
  cancelarOrdenSchema,
  prepararDespachoSchema,
  listarOrdenesQuerySchema,
} from './schemas.js';

export interface ProductionRouteOptions {
  composition: ProductionComposition;
}

const productionRoutes: FastifyPluginAsync<ProductionRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── POST /orders ──────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/orders',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearOrdenSchema.parse(request.body);
      const result = await composition.crearOrden.execute(
        {
          varianteId: body.varianteId,
          recetaId: body.recetaId,
          plantaCentralId: request.user.bu_id ?? '',
          cantidadAProducir: body.cantidadAProducir,
          creadaPor: request.user.sub,
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /orders/:id/bom ───────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/orders/:id/bom',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      calcularBOMSchema.parse(request.body);
      const ordenId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.calcularBOMYReservar.execute({ ordenId }, request.id);
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /orders/:id/iniciar ───────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/orders/:id/iniciar',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const ordenId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.iniciarOrden.execute(
        { ordenId, iniciadaPor: request.user.sub },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /orders/:id/mermas ────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/orders/:id/mermas',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const ordenId = uuidParam.parse((request.params as { id: string }).id);
      const body = registrarMermaSchema.parse(request.body);
      const result = await composition.registrarMerma.execute(
        {
          ordenId,
          ingredientId: body.ingredientId,
          cantidad: body.cantidad,
          unidad: body.unidad,
          motivo: body.motivo,
          registradaPor: request.user.sub,
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /orders/:id/ejecutar ──────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/orders/:id/ejecutar',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const ordenId = uuidParam.parse((request.params as { id: string }).id);
      const body = ejecutarOrdenSchema.parse(request.body);
      const result = await composition.ejecutarOrden.execute(
        {
          ordenId,
          cantidadProducida: body.cantidadProducida,
          codigoLote: body.codigoLote,
          ejecutadaPor: request.user.sub,
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── DELETE /orders/:id ─────────────────────────────────────────────────────
  fastify.route({
    method: 'DELETE',
    url: '/orders/:id',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const ordenId = uuidParam.parse((request.params as { id: string }).id);
      const body = cancelarOrdenSchema.parse(request.body);
      const result = await composition.cancelarOrden.execute(
        { ordenId, motivo: body.motivo, canceladaPor: request.user.sub },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /dispatches ───────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/dispatches',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = prepararDespachoSchema.parse(request.body);
      const result = await composition.prepararDespacho.execute(
        {
          ordenId: body.ordenId,
          cantidadDespachada: body.cantidadDespachada,
          puntoDeVentaDestinoId: body.puntoDeVentaDestinoId,
          preparadoPor: request.user.sub,
        },
        request.id,
      );
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── GET /orders ────────────────────────────────────────────────────────────
  fastify.route({
    method: 'GET',
    url: '/orders',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const query = listarOrdenesQuerySchema.parse(request.query);
      const result = await composition.listarOrdenes.execute({
        plantaCentralId: request.user.bu_id ?? '',
        ...(query.estado && { estado: query.estado as EstadoDeOrdenDeProduccion }),
      });
      return reply.code(200).send(result);
    },
  });
};

export default productionRoutes;
