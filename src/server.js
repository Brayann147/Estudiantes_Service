const env = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./database/pool');
const { createApp } = require('./app');

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info('Módulo Estudiantes iniciado', {
    port: env.port,
    env: env.nodeEnv,
    docs: `http://localhost:${env.port}/api-docs`,
  });
  // El servicio arranca aunque PostgreSQL no esté listo; /health mostrará 503 hasta que responda.
  pool.query('SELECT 1').catch((err) => {
    logger.warn('No hay conexión con PostgreSQL al iniciar', { error: err.message });
  });
});

// Apagado ordenado: deja de aceptar peticiones, espera las activas y cierra el pool.
function shutdown(signal) {
  logger.info(`Señal ${signal} recibida, cerrando...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
