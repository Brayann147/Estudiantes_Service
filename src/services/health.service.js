const { pool } = require('../database/pool');
const { version } = require('../../package.json');

const SERVICE_NAME = 'estudiantes-service';

async function check() {
  const base = { service: SERVICE_NAME, version, timestamp: new Date().toISOString() };
  try {
    await pool.query({ text: 'SELECT 1', query_timeout: 2000 });
    return { httpStatus: 200, body: { status: 'ok', ...base, database: { status: 'up' } } };
  } catch {
    return { httpStatus: 503, body: { status: 'error', ...base, database: { status: 'down' } } };
  }
}

module.exports = { check };
