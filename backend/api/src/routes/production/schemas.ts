import { z } from 'zod';

export const uuidParam = z.string().uuid('El identificador debe ser un UUID válido');

export const crearOrdenSchema = z.object({
  varianteId: z.string().uuid(),
  recetaId: z.string().uuid(),
  cantidadAProducir: z.number().int().min(1),
});

export const calcularBOMSchema = z.object({
  // El BOM se calcula internamente desde la receta vía ACL; el body solo
  // confirma la intención (idempotencia del BOM).
  confirmar: z.boolean().default(true),
});

export const iniciarOrdenSchema = z.object({
  confirmar: z.boolean().default(true),
});

export const registrarMermaSchema = z.object({
  ingredientId: z.string().uuid(),
  cantidad: z.number().positive(),
  unidad: z.enum(['kg', 'g', 'L', 'mL', 'unidad']),
  motivo: z.string().min(1).max(500),
});

export const ejecutarOrdenSchema = z.object({
  cantidadProducida: z.number().int().min(1),
  codigoLote: z.string().min(1).max(60),
});

export const cancelarOrdenSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export const prepararDespachoSchema = z.object({
  ordenId: z.string().uuid(),
  cantidadDespachada: z.number().int().min(1),
  puntoDeVentaDestinoId: z.string().uuid(),
});

export const listarOrdenesQuerySchema = z.object({
  estado: z.enum(['PLANIFICADA', 'RESERVADA', 'EN_EJECUCION', 'EJECUTADA', 'CANCELADA']).optional(),
});

export const enviarDespachoSchema = z.object({
  confirmar: z.boolean().default(true),
});

export const entregarDespachoSchema = z.object({
  recibidoPor: z.string().uuid(),
});

export const cancelarDespachoSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export const listarDespachosQuerySchema = z.object({
  ordenId: z.string().uuid(),
});
