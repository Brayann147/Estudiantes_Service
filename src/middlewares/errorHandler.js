const { AppError, Errors } = require('../errors');
const { mapDatabaseError } = require('../errors/databaseErrors');
const logger = require('../config/logger');

/** Convierte cualquier error en la respuesta uniforme { error: { code, message, details } }. */
function toAppError(err) {
  if (err instanceof AppError) return err;

  // Errores del parser JSON de Express (body-parser)
  if (err?.type === 'entity.parse.failed') return Errors.invalidJson();
  if (err?.type === 'entity.too.large') return Errors.payloadTooLarge();

  // Errores de PostgreSQL (restricciones, conexión, formatos)
  const dbError = mapDatabaseError(err);
  if (dbError) return dbError;

  return null;
}

function errorHandler(err, req, res, _next) {
  const appError = toAppError(err);

  if (!appError || appError.status >= 500) {
    // Solo se registra el detalle técnico en el log; el cliente nunca ve la traza.
    logger.error('Error al procesar la petición', {
      method: req.method,
      url: req.originalUrl,
      error: err?.message,
      stack: err?.stack,
    });
  }

  const final = appError ?? Errors.internal();
  res.status(final.status).json({
    error: { code: final.code, message: final.message, details: final.details },
  });
}

module.exports = errorHandler;
