import { parseEnv } from './env.js';
import { buildServer } from './server.js';
import {
  createIdentityAdapters,
  createCatalogAdapters,
  createInventoryAdapters,
  createProductionAdapters,
  createSalesAdapters,
} from '@zahavi/adapter-persistence-supabase';
import { createIdentityComposition } from './composition/identity.js';
import { createCatalogComposition } from './composition/catalog.js';
import { createInventoryComposition } from './composition/inventory.js';
import { createProductionComposition } from './composition/production.js';
import { createSalesComposition } from './composition/sales.js';

const env = parseEnv();
const identityAdapters = createIdentityAdapters(env.DATABASE_URL);
const catalogAdapters = createCatalogAdapters(env.DATABASE_URL);
const inventoryAdapters = createInventoryAdapters(env.DATABASE_URL);
const productionAdapters = createProductionAdapters(env.DATABASE_URL);
const salesAdapters = createSalesAdapters(env.DATABASE_URL);

const identityComposition = createIdentityComposition(identityAdapters);
const catalogComposition = createCatalogComposition(catalogAdapters);
const inventoryComposition = createInventoryComposition(inventoryAdapters);
const productionComposition = createProductionComposition(productionAdapters);
const salesComposition = createSalesComposition(salesAdapters);

const server = buildServer(
  env,
  identityComposition,
  catalogComposition,
  inventoryComposition,
  productionComposition,
  salesComposition,
);

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Zahavi API escuchando en ${address}`);
});
