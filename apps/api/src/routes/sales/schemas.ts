import { z } from 'zod';

export const uuidParam = z.string().uuid('El identificador debe ser un UUID válido');

export const configurarMesaSchema = z.object({
  nombre: z.string().min(1).max(100),
});

export const abrirAdHocSchema = z.object({
  nombre: z.string().min(1).max(100),
});

export const crearComandaSchema = z.object({
  mesaId: z.string().uuid(),
});

export const agregarLineaSchema = z.object({
  varianteId: z.string().uuid(),
  cantidad: z.number().int().min(1),
});

export const cancelarLineaSchema = z.object({
  motivo: z.string().min(1).max(500).optional(),
});

export const procesarCobroSchema = z.object({
  comandaId: z.string().uuid(),
  pagos: z
    .array(
      z.object({
        metodo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'NEQUI', 'DATAFONO']),
        monto: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const emitirFacturaSchema = z.object({
  cobroId: z.string().uuid(),
});

export const listarMesasQuerySchema = z.object({
  estado: z.enum(['LIBRE', 'OCUPADA', 'RESERVADA', 'EN_COBRO']).optional(),
});
