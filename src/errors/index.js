const AppError = require('./AppError');

// Fábricas de errores: un solo lugar con todos los códigos y mensajes de la API.
const Errors = {
  // 400 - petición mal formada
  invalidId: (field = 'id') =>
    new AppError(400, 'INVALID_ID', 'El identificador debe ser un entero positivo', [
      { field, message: 'Debe ser un entero positivo' },
    ]),
  invalidQuery: (details) =>
    new AppError(400, 'INVALID_QUERY_PARAMS', 'Los parámetros de consulta son inválidos', details),
  invalidJson: () =>
    new AppError(400, 'INVALID_JSON', 'El cuerpo de la petición no es un JSON válido'),
  payloadTooLarge: () =>
    new AppError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición supera el tamaño permitido'),

  // 422 - el cuerpo llegó bien formado pero no cumple las reglas
  validation: (details) =>
    new AppError(422, 'VALIDATION_ERROR', 'Los datos enviados no son válidos', details),
  programNotFoundInBody: () =>
    new AppError(422, 'PROGRAM_NOT_FOUND', 'El programa indicado no existe', [
      { field: 'programId', message: 'No existe un programa con ese id' },
    ]),

  // 404
  studentNotFound: () =>
    new AppError(404, 'STUDENT_NOT_FOUND', 'El estudiante solicitado no existe'),
  programNotFound: () => new AppError(404, 'PROGRAM_NOT_FOUND', 'El programa solicitado no existe'),
  contactNotFound: () =>
    new AppError(404, 'CONTACT_NOT_FOUND', 'El estudiante no tiene un contacto registrado'),
  documentNotFound: () =>
    new AppError(404, 'DOCUMENT_NOT_FOUND', 'El documento solicitado no existe'),
  routeNotFound: (method, path) =>
    new AppError(404, 'ROUTE_NOT_FOUND', `La ruta ${method} ${path} no existe`),

  // 409 - conflictos con el estado actual
  duplicateStudentDocument: () =>
    new AppError(
      409,
      'DUPLICATE_DOCUMENT_NUMBER',
      'Ya existe un estudiante con ese tipo y número de documento',
      [{ field: 'documentNumber', message: 'Valor duplicado' }],
    ),
  duplicateDocument: () =>
    new AppError(
      409,
      'DUPLICATE_DOCUMENT',
      'Ya existe un documento registrado con ese tipo y número',
      [{ field: 'number', message: 'Valor duplicado' }],
    ),
  duplicateEmail: () =>
    new AppError(409, 'DUPLICATE_EMAIL', 'Ya existe un contacto registrado con ese correo', [
      { field: 'email', message: 'Valor duplicado' },
    ]),
  duplicateProgramCode: () =>
    new AppError(409, 'DUPLICATE_PROGRAM_CODE', 'Ya existe un programa con ese código', [
      { field: 'code', message: 'Valor duplicado' },
    ]),
  contactAlreadyExists: () =>
    new AppError(409, 'CONTACT_ALREADY_EXISTS', 'El estudiante ya tiene un contacto principal'),
  programHasStudents: () =>
    new AppError(
      409,
      'PROGRAM_HAS_STUDENTS',
      'No se puede eliminar el programa porque tiene estudiantes asociados',
    ),
  constraintViolation: (detail) =>
    new AppError(
      409,
      'DB_CONSTRAINT_VIOLATION',
      'La operación viola una restricción de la base de datos',
      detail ? [{ message: detail }] : [],
    ),

  // 5xx
  databaseUnavailable: () =>
    new AppError(503, 'DATABASE_UNAVAILABLE', 'No fue posible conectar con la base de datos'),
  internal: () => new AppError(500, 'INTERNAL_ERROR', 'Ocurrió un error interno del servidor'),
};

module.exports = { AppError, Errors };
