import { parseEnv } from './env.js';
import { buildServer } from './server.js';
import { createIdentityAdapters } from '@zahavi/adapter-persistence-supabase';
import { createIdentityComposition } from './composition/identity.js';

const env = parseEnv();
const adapters = createIdentityAdapters(env.DATABASE_URL);
const composition = createIdentityComposition(adapters);
const server = buildServer(env, composition);

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Zahavi API escuchando en ${address}`);
});
