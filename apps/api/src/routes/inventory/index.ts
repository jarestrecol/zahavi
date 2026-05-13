import type { FastifyPluginAsync } from 'fastify';
import type { InventoryComposition } from '../../composition/inventory.js';
import { authenticate, requireRole } from '../../plugins/jwt.js';
import {
  uuidParam,
  crearIngredienteSchema,
  configurarUmbralSchema,
  crearProveedorSchema,
  registrarIngresoSchema,
  registrarSalidaSchema,
  registrarMermaSchema,
  ajustarStockSchema,
  listarStockQuerySchema,
  historicoQuerySchema,
} from './schemas.js';

export interface InventoryRouteOptions {
  composition: InventoryComposition;
}

const inventoryRoutes: FastifyPluginAsync<InventoryRouteOptions> = async (fastify, opts) => {
  const { composition } = opts;

  // ── POST /ingredientes ──────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/ingredientes',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearIngredienteSchema.parse(request.body);
      const result = await composition.crearIngrediente.execute({
        nombre: body.nombre,
        unidadNativa: body.unidadNativa,
        costoUnitarioCop: body.costoUnitarioCop,
        ...(body.umbralDeAlerta !== undefined && { umbralDeAlerta: body.umbralDeAlerta }),
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── PUT /ingredientes/:id/umbral ────────────────────────────────────────────
  fastify.route({
    method: 'PUT',
    url: '/ingredientes/:id/umbral',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const ingredienteId = uuidParam.parse((request.params as { id: string }).id);
      const body = configurarUmbralSchema.parse(request.body);
      const result = await composition.configurarAlertaIngrediente.execute({
        ingredienteId,
        nuevoUmbral: body.nuevoUmbral,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── POST /proveedores ───────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/proveedores',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = crearProveedorSchema.parse(request.body);
      const result = await composition.crearProveedor.execute({
        nombre: body.nombre,
        contacto: body.contacto,
        ...(body.notas !== undefined && { notas: body.notas }),
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /movimientos/ingreso ───────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/movimientos/ingreso',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = registrarIngresoSchema.parse(request.body);
      const result = await composition.registrarIngreso.execute({
        ingredienteId: body.ingredienteId,
        businessUnitId: body.businessUnitId,
        cantidad: body.cantidad,
        costoUnitarioCop: body.costoUnitarioCop,
        supplierId: body.supplierId,
        ...(body.referencia !== undefined && { referencia: body.referencia }),
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /movimientos/salida ────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/movimientos/salida',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = registrarSalidaSchema.parse(request.body);
      const result = await composition.registrarSalida.execute({
        ...body,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /movimientos/merma ─────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/movimientos/merma',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = registrarMermaSchema.parse(request.body);
      const result = await composition.registrarMerma.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(201).send(result.value);
    },
  });

  // ── POST /ajustes ───────────────────────────────────────────────────────────
  fastify.route({
    method: 'POST',
    url: '/ajustes',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const body = ajustarStockSchema.parse(request.body);
      const result = await composition.ajustarStock.execute({
        ...body,
        actorRol: request.user.zahavi_rol,
        correlacionId: request.id,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── GET /stock ──────────────────────────────────────────────────────────────
  fastify.route({
    method: 'GET',
    url: '/stock',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const query = listarStockQuerySchema.parse(request.query);
      const result = await composition.listarStockActual.execute({
        businessUnitId: query.businessUnitId,
        actorRol: request.user.zahavi_rol,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });

  // ── GET /historico ──────────────────────────────────────────────────────────
  fastify.route({
    method: 'GET',
    url: '/historico',
    preHandler: [authenticate, requireRole('ADMIN', 'SUPERADMIN')],
    handler: async (request, reply) => {
      const query = historicoQuerySchema.parse(request.query);
      const result = await composition.historicoMovimientos.execute({
        businessUnitId: query.businessUnitId,
        ...(query.ingredienteId !== undefined && { ingredienteId: query.ingredienteId }),
        ...(query.desde !== undefined && { desde: query.desde }),
        ...(query.hasta !== undefined && { hasta: query.hasta }),
        actorRol: request.user.zahavi_rol,
      });
      if (!result.ok) throw result.error;
      return reply.code(200).send(result.value);
    },
  });
};

export default inventoryRoutes;
