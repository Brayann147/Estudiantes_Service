const { Errors } = require('./index');

// Errores de red / disponibilidad (el servidor de PostgreSQL no responde).
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
]);

const CONNECTION_MESSAGES = [
  /connection terminated/i,
  /timeout exceeded when trying to connect/i,
  /connect ECONNREFUSED/i,
];

// Nombre de la restricción UNIQUE (definida en las migraciones) -> error de negocio.
const UNIQUE_CONSTRAINTS = {
  uq_students_document: Errors.duplicateStudentDocument,
  uq_contacts_email: Errors.duplicateEmail,
  uq_contacts_student: Errors.contactAlreadyExists,
  uq_documents_type_number: Errors.duplicateDocument,
  uq_programs_code: Errors.duplicateProgramCode,
};

function isConnectionError(err) {
  if (!err) return false;
  if (CONNECTION_ERROR_CODES.has(err.code)) return true;
  if (typeof err.code === 'string' && err.code.startsWith('08')) return true; // clase 08
  return CONNECTION_MESSAGES.some((re) => re.test(err.message ?? ''));
}

/**
 * Traduce un error de PostgreSQL (SQLSTATE) a un AppError.
 * Devuelve null si el error no es de base de datos o no se sabe interpretar.
 */
function mapDatabaseError(err) {
  if (isConnectionError(err)) return Errors.databaseUnavailable();

  switch (err?.code) {
    case '23505': {
      // unique_violation
      const factory = UNIQUE_CONSTRAINTS[err.constraint];
      return factory ? factory() : Errors.constraintViolation(err.detail);
    }
    case '23503': {
      // foreign_key_violation
      if (err.constraint === 'fk_students_program') {
        return /still referenced/i.test(err.detail ?? '')
          ? Errors.programHasStudents()
          : Errors.programNotFoundInBody();
      }
      return Errors.constraintViolation(err.detail);
    }
    case '23502': // not_null_violation
      return Errors.validation([{ field: err.column ?? '', message: 'Es obligatorio' }]);
    case '23514': // check_violation
      return Errors.validation([{ message: `Valor fuera de los permitidos (${err.constraint})` }]);
    case '22001': // string_data_right_truncation
      return Errors.validation([{ message: 'Uno de los textos supera la longitud máxima' }]);
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return Errors.validation([
        { message: 'Uno de los valores enviados tiene un formato inválido' },
      ]);
    default:
      return typeof err?.code === 'string' && err.code.startsWith('23')
        ? Errors.constraintViolation(err.detail)
        : null;
  }
}

module.exports = { mapDatabaseError, isConnectionError };
