import { z } from 'zod';

const fechaValida = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido')
  .refine((s) => !isNaN(new Date(s).getTime()), 'Fecha inválida');

export const dashboardQuerySchema = z.object({
  fecha: fechaValida.optional(),
});

export const cierreQuerySchema = z.object({
  desde: fechaValida,
  hasta: fechaValida,
});
