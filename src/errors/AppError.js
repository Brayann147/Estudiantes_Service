/**
 * Error controlado de la aplicación. El middleware global lo convierte en:
 * { "error": { "code", "message", "details" } }
 */
class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
