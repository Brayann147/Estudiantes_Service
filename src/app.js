const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const openapiSpec = require('./docs/openapi');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  // Seguridad: cabeceras HTTP seguras. Se quita "upgrade-insecure-requests" del CSP para que
  // Swagger UI cargue correctamente sobre http://localhost (en producción lo hace el proxy TLS).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(cors({ origin: env.corsOrigins }));

  // Logging de cada petición HTTP (silenciado en pruebas)
  if (!env.isTest) {
    app.use(
      morgan(env.isProduction ? 'combined' : ':method :url :status :response-time ms', {
        stream: { write: (line) => logger.info(line.trim()) },
      }),
    );
  }

  app.use(express.json({ limit: '100kb' }));

  // Documentación Swagger/OpenAPI
  app.get('/api-docs.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: 'Módulo Estudiantes - API Docs',
      swaggerOptions: { displayRequestDuration: true },
    }),
  );

  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
