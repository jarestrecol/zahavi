-- Rollback: Production BC
DROP TABLE IF EXISTS production.dispatches;
DROP TABLE IF EXISTS production.orders;
DROP SCHEMA IF EXISTS production;
