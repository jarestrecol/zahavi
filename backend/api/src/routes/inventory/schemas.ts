import { z } from 'zod';

export const uuidParam = z.string().uuid('El identificador debe ser un UUID válido');

export const crearIngredienteSchema = z.object({
  nombre: z.string().min(1).max(120),
  unidadNativa: z.string().min(1),
  costoUnitarioCop: z.number().int().min(0),
  umbralDeAlerta: z.number().min(0).optional(),
});

export const configurarUmbralSchema = z.object({
  nuevoUmbral: z.number().min(0),
});

export const crearProveedorSchema = z.object({
  nombre: z.string().min(1).max(120),
  contacto: z.string().min(1).max(500),
  notas: z.string().max(1000).optional(),
});

export const registrarIngresoSchema = z.object({
  ingredienteId: z.string().uuid(),
  // TODO(SEC): derivar businessUnitId del JWT (zahavi_business_unit_id) cuando se agregue al token
  businessUnitId: z.string().uuid(),
  cantidad: z.number().positive(),
  costoUnitarioCop: z.number().int().min(0),
  supplierId: z.string().uuid(),
  referencia: z.string().max(500).optional(),
});

export const registrarSalidaSchema = z.object({
  ingredienteId: z.string().uuid(),
  // TODO(SEC): derivar businessUnitId del JWT cuando se agregue al token
  businessUnitId: z.string().uuid(),
  cantidad: z.number().positive(),
  tipo: z.enum(['PRODUCTION_OUT', 'SALE_OUT']),
  referencia: z.string().min(1).max(500),
});

export const registrarMermaSchema = z.object({
  ingredienteId: z.string().uuid(),
  // TODO(SEC): derivar businessUnitId del JWT cuando se agregue al token
  businessUnitId: z.string().uuid(),
  cantidad: z.number().positive(),
  motivo: z.string().min(1).max(500),
});

export const ajustarStockSchema = z.object({
  ingredienteId: z.string().uuid(),
  // TODO(SEC): derivar businessUnitId del JWT cuando se agregue al token
  businessUnitId: z.string().uuid(),
  cantidadNueva: z.number().min(0),
  motivo: z.string().min(1).max(500),
});

export const listarStockQuerySchema = z.object({
  // TODO(SEC): derivar businessUnitId del JWT cuando se agregue al token
  businessUnitId: z.string().uuid(),
});

const MAX_RANGO_HISTORICO_MS = 366 * 24 * 60 * 60 * 1000; // 366 días

export const historicoQuerySchema = z
  .object({
    // TODO(SEC): derivar businessUnitId del JWT cuando se agregue al token
    businessUnitId: z.string().uuid(),
    ingredienteId: z.string().uuid().optional(),
    desde: z.string().datetime().optional(),
    hasta: z.string().datetime().optional(),
  })
  .refine(
    (q) => {
      if (!q.desde || !q.hasta) return true;
      return new Date(q.hasta).getTime() - new Date(q.desde).getTime() <= MAX_RANGO_HISTORICO_MS;
    },
    { message: 'El rango entre "desde" y "hasta" no puede superar 366 días' },
  );
