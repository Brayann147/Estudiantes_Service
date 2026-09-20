// Se ejecuta UNA vez antes de toda la suite:
//  1) crea la base de pruebas si no existe, 2) recrea el esquema y aplica las migraciones.
const { Client, Pool } = require('pg');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const env = require('../../src/config/env');
  const { migrate, resetSchema } = require('../../src/database/migrate');
  const { db } = env;

  const admin = new Client({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: 'postgres',
  });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${db.host}:${db.port} (${err.message}).\n` +
        'Levanta la base con "docker compose up -d" y revisa tu archivo .env antes de correr las pruebas.',
      { cause: err },
    );
  }
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      db.database,
    ]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${db.database.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }

  const pool = new Pool({ ...db });
  try {
    // Esquema limpio en cada corrida: las pruebas no dependen de ejecuciones anteriores.
    await resetSchema(pool);
    await migrate({ pool });
  } finally {
    await pool.end();
  }
};
