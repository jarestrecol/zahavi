export { createHealthCheck } from './health.js';
export type { HealthCheckResult } from './health.js';
export { createSharedPool } from './pool.js';

export * from './identity/index.js';
export { createIdentityAdapters } from './identity/factory.js';
export type { IdentityAdapters } from './identity/factory.js';

export * from './catalog/index.js';
export { createCatalogAdapters } from './catalog/factory.js';
export type { CatalogAdapters } from './catalog/factory.js';

export * from './inventory/index.js';
export { createInventoryAdapters } from './inventory/factory.js';
export type { InventoryAdapters } from './inventory/factory.js';

export * from './production/index.js';
export { createProductionAdapters } from './production/factory.js';
export type { ProductionAdapters } from './production/factory.js';

export * from './sales/index.js';
export { createSalesAdapters } from './sales/factory.js';
export type { SalesAdapters } from './sales/factory.js';

export * from './reporting/index.js';
export { createReportingAdapters } from './reporting/factory.js';
export type { ReportingAdapters } from './reporting/factory.js';
