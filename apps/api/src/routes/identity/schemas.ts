import { z } from 'zod';

// MED-4 + HIGH-3: UUID helper reutilizable para params
export const uuidParam = z.string().uuid('El identificador debe ser un UUID válido');

// HIGH-3: limitar longitud de contraseñas para prevenir DoS vía bcrypt con inputs gigantes
const contrasenaSchema = z.string().min(1).max(128);
// PIN siempre exactamente 6 dígitos
const pinSchema = z.string().length(6);

export const registrarUsuarioSchema = z.discriminatedUnion('tipoCredencial', [
  z.object({
    email: z.string().email().max(254),
    nombreCompleto: z.string().min(2).max(120),
    rol: z.enum(['SUPERADMIN', 'ADMIN', 'WORKER']),
    tipoCredencial: z.literal('navegador'),
    contrasenaEnClaro: contrasenaSchema,
  }),
  z.object({
    email: z.string().email().max(254),
    nombreCompleto: z.string().min(2).max(120),
    rol: z.enum(['SUPERADMIN', 'ADMIN', 'WORKER']),
    tipoCredencial: z.literal('tablet'),
    pinEnClaro: pinSchema,
  }),
]);

export const asignarRolSchema = z.discriminatedUnion('tipoCredencial', [
  z.object({
    nuevoRol: z.enum(['SUPERADMIN', 'ADMIN', 'WORKER']),
    tipoCredencial: z.literal('navegador'),
    contrasenaEnClaro: contrasenaSchema,
  }),
  z.object({
    nuevoRol: z.enum(['SUPERADMIN', 'ADMIN', 'WORKER']),
    tipoCredencial: z.literal('tablet'),
    pinEnClaro: pinSchema,
  }),
]);

export const iniciarSesionSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('navegador'),
    email: z.string().email().max(254),
    contrasenaEnClaro: contrasenaSchema,
    codigoTotp: z.string().length(6),
  }),
  z.object({
    tipo: z.literal('tablet'),
    email: z.string().email().max(254),
    dispositivoId: z.string().uuid(),
    pinEnClaro: pinSchema,
  }),
]);

export const confirmarTotpSchema = z.object({
  codigoTotp: z.string().length(6),
});
