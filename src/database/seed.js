/**
 * Ejecuta los seeders de /seeders en orden alfabético, todos dentro de UNA transacción.
 * Son idempotentes (ON CONFLICT DO NOTHING): se pueden correr varias veces sin duplicar datos.
 *
 * Uso: npm run seed
 */
const fs = require('node:fs');
const path = require('node:path');

const SEEDERS_DIR = path.resolve(__dirname, '../../seeders');

async function seed({ pool, dir = SEEDERS_DIR, log = () => {} }) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const seeder = require(path.join(dir, file));
      await seeder.run(client);
      log(`  ✔ seeder ${file}`);
    }
    await client.query('COMMIT');
    return files;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seed };

if (require.main === module) {
  const env = require('../config/env');
  const { pool } = require('./pool');

  (async () => {
    if (env.isProduction) {
      throw new Error('Los seeders de prueba están deshabilitados en producción');
    }
    console.log(`Base de datos: ${env.db.database} @ ${env.db.host}:${env.db.port}`);
    const files = await seed({ pool, log: console.log });
    console.log(`Seeders ejecutados: ${files.length}`);
  })()
    .catch((err) => {
      console.error(`Error ejecutando seeders: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
