import { z } from 'zod';

export const uuidParam = z.string().uuid('El identificador debe ser un UUID válido');

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(1).max(120),
  padreId: z.string().uuid().nullable().default(null),
  orden: z.number().int().min(0),
});

const httpsUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//.test(u), 'Solo se permiten URLs http/https')
  .nullable();

export const crearProductoSchema = z.object({
  nombre: z.string().min(1).max(120),
  categoriaId: z.string().uuid(),
  imagenUrl: httpsUrl.default(null),
  varianteInicial: z.object({
    nombre: z.string().min(1).max(120),
    precioCop: z.number().int().min(0),
  }),
});

export const archivarProductoSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export const crearRecetaSchema = z.object({
  varianteId: z.string().uuid(),
  productoId: z.string().uuid(),
  lineas: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        cantidadValor: z.number().positive(),
        unidad: z.string().min(1).max(20),
        esEmpaque: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(100),
});

export const crearComboSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).default(''),
  imagenUrl: httpsUrl.default(null),
  precioCop: z.number().int().min(0),
  items: z
    .array(
      z.object({
        productoVarianteId: z.string().uuid(),
        cantidadValor: z.number().positive(),
        unidad: z.string().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});
