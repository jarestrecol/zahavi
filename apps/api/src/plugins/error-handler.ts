import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '@zahavi/domain-identity';
import { RepositorioNoDisponibleError } from '@zahavi/ports';

const DOMAIN_STATUS: Record<string, number> = {
  IDENTITY_EMAIL_INVALIDO: 422,
  IDENTITY_NOMBRE_INVALIDO: 422,
  IDENTITY_PIN_INVALIDO: 422,
  IDENTITY_CONTRASENA_DEBIL: 422,
  IDENTITY_CREDENCIAL_INCOHERENTE: 422,
  IDENTITY_NOMBRE_DISPOSITIVO_VACIO: 422,
  IDENTITY_ROL_NO_AUTORIZADO_CREAR: 403,
  IDENTITY_ACCION_SOBRE_SI_MISMO: 403,
  IDENTITY_USUARIO_NO_ACTIVO: 403,
  IDENTITY_TOTP_NO_VERIFICADO: 403,
  IDENTITY_DISPOSITIVO_REQUERIDO: 403,
  IDENTITY_DISPOSITIVO_NO_AUTORIZADO: 403,
  IDENTITY_DISPOSITIVO_NO_ACTIVO: 409,
  IDENTITY_ULTIMO_SUPERADMIN_PROTEGIDO: 409,
  IDENTITY_SESION_YA_CERRADA: 409,
  IDENTITY_DISPOSITIVO_YA_ACTIVO: 409,
  IDENTITY_EMAIL_YA_REGISTRADO: 409,
  IDENTITY_CREDENCIALES_INVALIDAS: 401,
  IDENTITY_SESION_EXPIRADA: 401,
  IDENTITY_SESION_NO_ENCONTRADA: 404,
  IDENTITY_USUARIO_NO_ENCONTRADO: 404,
  IDENTITY_LIMITE_SESIONES: 429,
  IDENTITY_SESION_BLOQUEADA: 423,
  // MED-5 de la auditoría: reloj retrocedido → 503 genérico (no 500 que filtraría info de infra)
  IDENTITY_RELOJ_RETROCEDIDO: 503,
  // Reporting
  REPORTING_RANGO_FECHAS_INVALIDO: 400,
};

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // HIGH-4: ZodError → 422 con campos (sin valores, solo paths y mensajes)
  if (error instanceof ZodError) {
    const campos = error.errors.map((e) => ({
      campo: e.path.join('.'),
      razon: e.message,
    }));
    void reply.code(422).send({ error: 'VALIDACION_FALLIDA', campos });
    return;
  }

  if (error instanceof DomainError) {
    const status = DOMAIN_STATUS[error.code] ?? 422;
    void reply.code(status).send({ error: error.code, mensaje: error.message });
    return;
  }

  if (error instanceof RepositorioNoDisponibleError) {
    const cause = error.cause as (Error & { code?: string }) | undefined;
    request.log.error(
      { err: { name: cause?.name, code: cause?.code, msg: cause?.message } },
      'Repositorio no disponible',
    );
    void reply
      .code(503)
      .send({ error: 'SERVICIO_NO_DISPONIBLE', mensaje: 'Servicio temporalmente no disponible' });
    return;
  }

  // Errores Fastify con statusCode propio (JWT expirado, rate-limit, etc.)
  const statusCode = (error as FastifyError).statusCode;
  if (statusCode && statusCode < 500) {
    // MED-3: no exponer error.message (puede contener paths internos); usar código opaco
    void reply
      .code(statusCode)
      .send({ error: 'SOLICITUD_RECHAZADA', codigo: (error as FastifyError).code });
    return;
  }

  // Error inesperado — loguear con contexto, no exponer detalles al cliente
  request.log.error({ err: { name: error.name, message: error.message } }, 'Error no controlado');
  void reply.code(500).send({ error: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
}
