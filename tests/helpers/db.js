const env = require('../../src/config/env');
const { pool } = require('../../src/database/pool');

// Salvaguarda: JAMÁS vaciar tablas si por error se apuntó a la base de desarrollo.
function assertTestDatabase() {
  if (!env.db.database.endsWith('_test')) {
    throw new Error(`Las pruebas solo pueden usar una base "*_test" (actual: ${env.db.database})`);
  }
}

async function resetDatabase() {
  assertTestDatabase();
  await pool.query(
    'TRUNCATE TABLE documents, contacts, students, programs RESTART IDENTITY CASCADE',
  );
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { pool, resetDatabase, closeDatabase };
