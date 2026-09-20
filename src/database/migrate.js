/**
 * Ejecutor de migraciones minimalista (sin dependencias extra).
 *  - Aplica en orden alfabético los archivos migrations/*.sql que aún no estén registrados
 *    en la tabla schema_migrations.
 *  - Cada migración corre dentro de una transacción.
 *
 * Uso:  npm run migrate            (aplica pendientes)
 *       npm run migrate:reset      (BORRA todo el esquema y vuelve a migrar; solo fuera de producción)
 */
const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const LOCK_ID = 738421; // pg_advisory_lock: evita dos migraciones simultáneas

async function migrate({ pool, dir = MIGRATIONS_DIR, log = () => {} }) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const executed = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migración ${file} falló: ${err.message}`;
        throw err;
      }
      log(`  ✔ aplicada ${file}`);
      executed.push(file);
    }
    return executed;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

async function resetSchema(pool) {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
}

module.exports = { migrate, resetSchema };

// --- Ejecución por línea de comandos ---
if (require.main === module) {
  const env = require('../config/env');
  const { pool } = require('./pool');

  (async () => {
    console.log(`Base de datos: ${env.db.database} @ ${env.db.host}:${env.db.port}`);
    if (process.argv.includes('--reset')) {
      if (env.isProduction) {
        throw new Error('migrate:reset está deshabilitado en producción');
      }
      console.log('Reiniciando esquema (DROP SCHEMA public CASCADE)...');
      await resetSchema(pool);
    }
    const executed = await migrate({ pool, log: console.log });
    console.log(
      executed.length
        ? `Migraciones aplicadas: ${executed.length}`
        : 'No hay migraciones pendientes.',
    );
  })()
    .catch((err) => {
      console.error(`Error ejecutando migraciones: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
