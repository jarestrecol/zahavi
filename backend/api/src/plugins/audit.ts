import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { IAuditLogger } from '@zahavi/ports';

declare module 'fastify' {
  interface FastifyInstance {
    auditLogger: IAuditLogger;
  }
}

interface AuditPluginOptions {
  auditLogger: IAuditLogger;
}

const auditPlugin: FastifyPluginAsync<AuditPluginOptions> = async (fastify, opts) => {
  fastify.decorate('auditLogger', opts.auditLogger);
};

export default fp(auditPlugin, { name: 'audit' });
