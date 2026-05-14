import { readFile } from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no definido. Copia .env.example a .env primero.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

const seeds = [
  '01_business_units',
  '02_users',
  '03_categories',
  '04_ingredients',
  '05_products',
];

try {
  for (const seed of seeds) {
    const sql = await readFile(new URL(`../db/seeds/${seed}.sql`, import.meta.url), 'utf8');
    await pool.query(sql);
    console.log(`  Seed aplicado: ${seed}`);
  }
  console.log('Seeds aplicados correctamente.');
} catch (err) {
  console.error('Error al aplicar seeds:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
