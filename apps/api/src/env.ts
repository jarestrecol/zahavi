import { z } from 'zod';

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    PORT: z
      .string()
      .default('3000')
      .transform((v) => parseInt(v, 10)),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // MED-1: CORS_ORIGIN no puede ser '*' en producción
    CORS_ORIGIN: z.string().default('*'),
  })
  .refine((data) => !(data.NODE_ENV === 'production' && data.CORS_ORIGIN === '*'), {
    message: 'CORS_ORIGIN no puede ser "*" en producción',
    path: ['CORS_ORIGIN'],
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // No loguear process.env — puede contener secretos
    console.error('Variables de entorno inválidas:');
    for (const issue of result.error.errors) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}
