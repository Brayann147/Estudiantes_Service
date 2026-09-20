const { Pool, types } = require('pg');
const env = require('../config/env');
const logger = require('../config/logger');

// DATE (OID 1082) se devuelve como texto "YYYY-MM-DD" para evitar corrimientos por zona horaria.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: env.db.max,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Evita que un error en un cliente inactivo tumbe el proceso.
pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL', { error: err.message });
});

/** Ejecuta `fn(client)` dentro de una transacción (COMMIT si sale bien, ROLLBACK si falla). */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Falló el ROLLBACK', { error: rollbackErr.message });
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
