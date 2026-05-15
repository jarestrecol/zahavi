import { parseEnv } from './env.js';
import { buildServer } from './server.js';
import {
  createIdentityAdapters,
  createCatalogAdapters,
  createInventoryAdapters,
  createProductionAdapters,
  createSalesAdapters,
  createReportingAdapters,
  createHealthCheck,
  createSharedPool,
} from '@zahavi/adapter-persistence-supabase';
import { createIdentityComposition } from './composition/identity.js';
import { createCatalogComposition } from './composition/catalog.js';
import { createInventoryComposition } from './composition/inventory.js';
import { createProductionComposition } from './composition/production.js';
import { createSalesComposition } from './composition/sales.js';
import { createReportingComposition } from './composition/reporting.js';

const env = parseEnv();
// Un solo pool compartido por todos los BCs — evita abrir N*max_connections (D-018).
// El health check mantiene su propio pool mínimo (max:1) para no ocupar conexiones productivas.
const sharedPool = createSharedPool(env.DATABASE_URL);
const checkDb = createHealthCheck(env.DATABASE_URL);
const identityAdapters = createIdentityAdapters(sharedPool);
const catalogAdapters = createCatalogAdapters(sharedPool);
const inventoryAdapters = createInventoryAdapters(sharedPool);
const productionAdapters = createProductionAdapters(sharedPool);
const salesAdapters = createSalesAdapters(sharedPool);
const reportingAdapters = createReportingAdapters(sharedPool);

const identityComposition = createIdentityComposition(identityAdapters);
const catalogComposition = createCatalogComposition(catalogAdapters);
const inventoryComposition = createInventoryComposition(inventoryAdapters);
const productionComposition = createProductionComposition(productionAdapters);
const salesComposition = createSalesComposition(salesAdapters);
const reportingComposition = createReportingComposition(reportingAdapters);

const server = buildServer(
  env,
  identityComposition,
  catalogComposition,
  inventoryComposition,
  productionComposition,
  salesComposition,
  reportingComposition,
  checkDb,
);

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Zahavi API escuchando en ${address}`);
});
