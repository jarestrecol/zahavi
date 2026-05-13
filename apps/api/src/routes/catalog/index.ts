import type { FastifyPluginAsync } from 'fastify';
import type { CatalogComposition } from '../../composition/catalog.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import {
  uuidParam,
  crearCategoriaSchema,
  crearProductoSchema,
  archivarProductoSchema,
  crearRecetaSchema,
  crearComboSchema,
} from './schemas.js';

export interface CatalogRouteOptions {
  composition: CatalogComposition;
}

const catalogRoutes: FastifyPluginAsync<CatalogRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── POST /categorias ────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/categorias',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearCategoriaSchema.parse(request.body);
      const result = await composition.crearCategoria.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /categorias/:id/archivar ───────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/categorias/:id/archivar',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const categoriaId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.archivarCategoria.execute({
        categoriaId,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /productos ─────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/productos',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearProductoSchema.parse(request.body);
      const result = await composition.crearProducto.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /productos/:id/activar ─────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/productos/:id/activar',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const productoId = uuidParam.parse((request.params as { id: string }).id);
      const result = await composition.activarProducto.execute({
        productoId,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /productos/:id/archivar ────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/productos/:id/archivar',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const productoId = uuidParam.parse((request.params as { id: string }).id);
      const body = archivarProductoSchema.parse(request.body);
      const result = await composition.archivarProducto.execute({
        productoId,
        motivo: body.motivo,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /recetas ───────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/recetas',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearRecetaSchema.parse(request.body);
      const result = await composition.crearReceta.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── GET /productos/:id/variantes/:varianteId/escandallo ─────────────────────
  fastify.route({
    method: 'GET',
    url: '/productos/:id/variantes/:varianteId/escandallo',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const params = request.params as { id: string; varianteId: string };
      const productoId = uuidParam.parse(params.id);
      const varianteId = uuidParam.parse(params.varianteId);
      const result = await composition.calcularEscandallo.execute({
        productoId,
        varianteId,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /combos ────────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/combos',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearComboSchema.parse(request.body);
      const result = await composition.crearCombo.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });
};

export default catalogRoutes;
