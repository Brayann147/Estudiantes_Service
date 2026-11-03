const {
  STUDENT_STATUSES,
  PROGRAM_STATUSES,
  MODALITIES,
  SORT_DIRECTIONS,
} = require('../constants/enums');
const {
  sortFields,
  studentExample,
  programExample,
  contactExample,
  documentExample,
  paginationExample,
} = require('./schemas');

// ---------- Helpers ----------
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const param = (name) => ({ $ref: `#/components/parameters/${name}` });
const json = (schema, example) => ({
  'application/json': { schema: ref(schema), ...(example ? { example } : {}) },
});
const success = (description, schema, example) => ({ description, content: json(schema, example) });
const requestBody = (schema) => ({ required: true, content: json(schema) });

const errorBody = (code, message, details = []) => ({ error: { code, message, details } });
const failure = (description, code, message, details = []) => ({
  description,
  content: json('ErrorResponse', errorBody(code, message, details)),
});

const E = {
  invalidId: (field = 'id') =>
    failure(
      'Identificador inválido',
      'INVALID_ID',
      'El identificador debe ser un entero positivo',
      [{ field, message: 'Debe ser un entero positivo' }],
    ),
  invalidQuery: failure(
    'Parámetros de consulta inválidos (paginación, ordenamiento o filtros)',
    'INVALID_QUERY_PARAMS',
    'Los parámetros de consulta son inválidos',
    [{ field: 'sortBy', message: 'Opción inválida: se esperaba una de "id"|"firstName"|...' }],
  ),
  validation: (details = [{ field: 'firstName', message: 'Es obligatorio' }]) =>
    failure(
      'Datos inválidos (cuerpo JSON que no cumple las reglas de validación)',
      'VALIDATION_ERROR',
      'Los datos enviados no son válidos',
      details,
    ),
  studentNotFound: failure(
    'El estudiante no existe',
    'STUDENT_NOT_FOUND',
    'El estudiante solicitado no existe',
  ),
  programNotFound: failure(
    'El programa no existe',
    'PROGRAM_NOT_FOUND',
    'El programa solicitado no existe',
  ),
  programMissing: failure(
    'El programa indicado en programId no existe',
    'PROGRAM_NOT_FOUND',
    'El programa indicado no existe',
    [{ field: 'programId', message: 'No existe un programa con ese id' }],
  ),
  contactNotFound: failure(
    'El estudiante no tiene contacto',
    'CONTACT_NOT_FOUND',
    'El estudiante no tiene un contacto registrado',
  ),
  documentNotFound: failure(
    'El documento no existe',
    'DOCUMENT_NOT_FOUND',
    'El documento solicitado no existe',
  ),
  internal: failure(
    'Error interno del servidor',
    'INTERNAL_ERROR',
    'Ocurrió un error interno del servidor',
  ),
  dbDown: failure(
    'PostgreSQL no está disponible',
    'DATABASE_UNAVAILABLE',
    'No fue posible conectar con la base de datos',
  ),
};

const conflict = (description, code, message, details = []) =>
  failure(description, code, message, details);

const common = { 500: E.internal, 503: E.dbDown };

// ---------- Parámetros reutilizables ----------
const parameters = {
  PageNumber: {
    name: 'pageNumber',
    in: 'query',
    description: 'Número de página (empieza en 1)',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  PageSize: {
    name: 'pageSize',
    in: 'query',
    description: 'Elementos por página (máximo 100)',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  },
  SortDirection: {
    name: 'sortDirection',
    in: 'query',
    description: 'Dirección del ordenamiento',
    schema: { type: 'string', enum: SORT_DIRECTIONS, default: 'asc' },
  },
  StudentIdPath: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Id del estudiante',
    schema: { type: 'integer', minimum: 1 },
    example: 12,
  },
  StudentIdNestedPath: {
    name: 'studentId',
    in: 'path',
    required: true,
    description: 'Id del estudiante',
    schema: { type: 'integer', minimum: 1 },
    example: 12,
  },
  ProgramIdPath: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Id del programa',
    schema: { type: 'integer', minimum: 1 },
    example: 1,
  },
  DocumentIdPath: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Id del documento',
    schema: { type: 'integer', minimum: 1 },
    example: 31,
  },
};

const studentListParams = [
  param('PageNumber'),
  param('PageSize'),
  {
    name: 'sortBy',
    in: 'query',
    description: 'Campo de ordenamiento (lista blanca)',
    schema: { type: 'string', enum: sortFields.student, default: 'id' },
  },
  param('SortDirection'),
  {
    name: 'name',
    in: 'query',
    description: 'Filtro: contiene este texto en nombre + apellido (sin distinguir mayúsculas)',
    schema: { type: 'string' },
    example: 'Laura',
  },
  {
    name: 'programId',
    in: 'query',
    description: 'Filtro: id del programa',
    schema: { type: 'integer', minimum: 1 },
    example: 2,
  },
  {
    name: 'status',
    in: 'query',
    description: 'Filtro: estado del estudiante',
    schema: { type: 'string', enum: STUDENT_STATUSES },
    example: 'active',
  },
  {
    name: 'documentNumber',
    in: 'query',
    description: 'Filtro: número de documento exacto',
    schema: { type: 'string' },
    example: '1001000012',
  },
  {
    name: 'email',
    in: 'query',
    description: 'Filtro: correo exacto del contacto principal',
    schema: { type: 'string', format: 'email' },
    example: 'laura.gomez@example.com',
  },
];

const programListParams = [
  param('PageNumber'),
  param('PageSize'),
  {
    name: 'sortBy',
    in: 'query',
    description: 'Campo de ordenamiento (lista blanca)',
    schema: { type: 'string', enum: sortFields.program, default: 'id' },
  },
  param('SortDirection'),
  {
    name: 'name',
    in: 'query',
    description: 'Filtro: contiene este texto en el nombre',
    schema: { type: 'string' },
    example: 'Ingeniería',
  },
  {
    name: 'faculty',
    in: 'query',
    description: 'Filtro: contiene este texto en la facultad',
    schema: { type: 'string' },
  },
  {
    name: 'status',
    in: 'query',
    description: 'Filtro: estado',
    schema: { type: 'string', enum: PROGRAM_STATUSES },
  },
  {
    name: 'modality',
    in: 'query',
    description: 'Filtro: modalidad',
    schema: { type: 'string', enum: MODALITIES },
  },
];

// ---------- Rutas ----------
const paths = {
  '/health': {
    get: {
      tags: ['Salud'],
      summary: 'Estado del servicio y de PostgreSQL',
      description:
        'Devuelve 200 si la API y la base de datos responden; 503 si la base de datos no está disponible.',
      responses: {
        200: success('Servicio y base de datos operativos', 'Health', {
          status: 'ok',
          service: 'estudiantes-service',
          version: '1.0.0',
          timestamp: '2026-09-19T15:04:05.000Z',
          database: { status: 'up' },
        }),
        503: {
          description: 'La base de datos no responde',
          content: json('Health', {
            status: 'error',
            service: 'estudiantes-service',
            version: '1.0.0',
            timestamp: '2026-09-19T15:04:05.000Z',
            database: { status: 'down' },
          }),
        },
      },
    },
  },

  // ===== Estudiantes =====
  '/api/estudiantes': {
    get: {
      tags: ['Estudiantes'],
      summary: 'Listar estudiantes (paginado, ordenable y filtrable)',
      description:
        'Ejemplo: `GET /api/estudiantes?pageNumber=1&pageSize=10&sortBy=lastName&sortDirection=asc&status=active`. Los filtros se combinan con AND.',
      parameters: studentListParams,
      responses: {
        200: success('Página de estudiantes', 'PaginatedStudents', {
          data: [studentExample],
          pagination: paginationExample,
        }),
        400: E.invalidQuery,
        ...common,
      },
    },
    post: {
      tags: ['Estudiantes'],
      summary: 'Crear un estudiante',
      requestBody: requestBody('StudentCreate'),
      responses: {
        201: success('Estudiante creado (cabecera Location con su URL)', 'Student', studentExample),
        409: conflict(
          'Ya existe un estudiante con ese tipo y número de documento',
          'DUPLICATE_DOCUMENT_NUMBER',
          'Ya existe un estudiante con ese tipo y número de documento',
          [{ field: 'documentNumber', message: 'Valor duplicado' }],
        ),
        422: E.validation(),
        ...common,
      },
    },
  },
  '/api/estudiantes/{id}': {
    parameters: [param('StudentIdPath')],
    get: {
      tags: ['Estudiantes'],
      summary: 'Obtener un estudiante (contrato para el Gateway)',
      description:
        'Devuelve como mínimo `id`, `nombre` y `programa`, que el API Gateway usa para armar `GET /api/estudiantes/{id}/detalle`. ' +
        'Este módulo NO consulta Materias ni Inscripciones.',
      responses: {
        200: success('Estudiante encontrado', 'Student', studentExample),
        400: E.invalidId(),
        404: E.studentNotFound,
        ...common,
      },
    },
    put: {
      tags: ['Estudiantes'],
      summary: 'Reemplazar un estudiante (todos los campos)',
      requestBody: requestBody('StudentReplace'),
      responses: {
        200: success('Estudiante actualizado', 'Student', studentExample),
        400: E.invalidId(),
        404: E.studentNotFound,
        409: conflict(
          'Documento duplicado',
          'DUPLICATE_DOCUMENT_NUMBER',
          'Ya existe un estudiante con ese tipo y número de documento',
          [{ field: 'documentNumber', message: 'Valor duplicado' }],
        ),
        422: E.programMissing,
        ...common,
      },
    },
    patch: {
      tags: ['Estudiantes'],
      summary: 'Actualizar parcialmente un estudiante',
      requestBody: requestBody('StudentPatch'),
      responses: {
        200: success('Estudiante actualizado', 'Student', studentExample),
        400: E.invalidId(),
        404: E.studentNotFound,
        409: conflict(
          'Documento duplicado',
          'DUPLICATE_DOCUMENT_NUMBER',
          'Ya existe un estudiante con ese tipo y número de documento',
          [{ field: 'documentNumber', message: 'Valor duplicado' }],
        ),
        422: E.validation([
          { field: '', message: 'Debe enviar al menos un campo para actualizar' },
        ]),
        ...common,
      },
    },
    delete: {
      tags: ['Estudiantes'],
      summary: 'Eliminar un estudiante',
      description:
        'Elimina también su contacto y sus documentos (ON DELETE CASCADE) y su fotografía del almacenamiento.',
      responses: {
        204: { description: 'Eliminado (sin contenido)' },
        400: E.invalidId(),
        404: E.studentNotFound,
        ...common,
      },
    },
  },
  '/api/estudiantes/{id}/foto': {
    parameters: [param('StudentIdPath')],
    put: {
      tags: ['Estudiantes'],
      summary: 'Subir o reemplazar la fotografía',
      description:
        'multipart/form-data con el campo `file`. Solo JPG o PNG (se verifica el contenido real, no la extensión), máximo 2 MB. ' +
        'El archivo se guarda en el bucket privado; la base guarda solo sus metadatos. Si ya tenía foto, la anterior se elimina.',
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: ref('PhotoUpload') } },
      },
      responses: {
        200: success(
          'Fotografía guardada; el estudiante incluye `foto` y `fotoUrl`',
          'Student',
          studentExample,
        ),
        400: E.invalidId(),
        404: E.studentNotFound,
        413: failure(
          'Archivo mayor a 2 MB',
          'PHOTO_TOO_LARGE',
          'La fotografía supera el tamaño máximo de 2 MB',
          [{ field: 'file', message: 'Máximo 2 MB' }],
        ),
        415: failure(
          'No es JPG ni PNG',
          'UNSUPPORTED_PHOTO_TYPE',
          'Solo se aceptan imágenes JPG o PNG',
          [{ field: 'file', message: 'Debe ser JPG o PNG' }],
        ),
        422: failure(
          'No se envió el archivo',
          'PHOTO_REQUIRED',
          'Debe enviar la fotografía en el campo "file" (multipart/form-data)',
          [{ field: 'file', message: 'Es obligatorio' }],
        ),
        500: E.internal,
        503: failure(
          'PostgreSQL o el almacenamiento no disponible',
          'STORAGE_UNAVAILABLE',
          'No fue posible acceder al almacenamiento de archivos',
        ),
      },
    },
    get: {
      tags: ['Estudiantes'],
      summary: 'Obtener una URL temporal de la fotografía',
      description:
        'El bucket es privado: el objeto solo se puede leer con esta URL firmada, que vence en `expiresIn` segundos.',
      responses: {
        200: success('URL firmada', 'PhotoUrl', { url: studentExample.fotoUrl, expiresIn: 600 }),
        400: E.invalidId(),
        404: failure(
          'El estudiante no existe o no tiene foto',
          'PHOTO_NOT_FOUND',
          'El estudiante no tiene una fotografía registrada',
        ),
        ...common,
      },
    },
    delete: {
      tags: ['Estudiantes'],
      summary: 'Eliminar la fotografía',
      responses: {
        204: { description: 'Eliminada (sin contenido)' },
        400: E.invalidId(),
        404: failure(
          'El estudiante no existe o no tiene foto',
          'PHOTO_NOT_FOUND',
          'El estudiante no tiene una fotografía registrada',
        ),
        ...common,
      },
    },
  },

  // ===== Programas =====
  '/api/programas': {
    get: {
      tags: ['Programas'],
      summary: 'Listar programas (paginado, ordenable y filtrable)',
      parameters: programListParams,
      responses: {
        200: success('Página de programas', 'PaginatedPrograms', {
          data: [programExample],
          pagination: { ...paginationExample, totalItems: 7, totalPages: 1 },
        }),
        400: E.invalidQuery,
        ...common,
      },
    },
    post: {
      tags: ['Programas'],
      summary: 'Crear un programa',
      requestBody: requestBody('ProgramCreate'),
      responses: {
        201: success('Programa creado', 'Program', programExample),
        409: conflict(
          'El código ya existe',
          'DUPLICATE_PROGRAM_CODE',
          'Ya existe un programa con ese código',
          [{ field: 'code', message: 'Valor duplicado' }],
        ),
        422: E.validation([{ field: 'code', message: 'Es obligatorio' }]),
        ...common,
      },
    },
  },
  '/api/programas/{id}': {
    parameters: [param('ProgramIdPath')],
    get: {
      tags: ['Programas'],
      summary: 'Obtener un programa',
      responses: {
        200: success('Programa encontrado', 'Program', programExample),
        400: E.invalidId(),
        404: E.programNotFound,
        ...common,
      },
    },
    put: {
      tags: ['Programas'],
      summary: 'Reemplazar un programa (todos los campos)',
      requestBody: requestBody('ProgramReplace'),
      responses: {
        200: success('Programa actualizado', 'Program', programExample),
        400: E.invalidId(),
        404: E.programNotFound,
        409: conflict(
          'El código ya existe',
          'DUPLICATE_PROGRAM_CODE',
          'Ya existe un programa con ese código',
          [{ field: 'code', message: 'Valor duplicado' }],
        ),
        422: E.validation([{ field: 'name', message: 'Es obligatorio' }]),
        ...common,
      },
    },
    patch: {
      tags: ['Programas'],
      summary: 'Actualizar parcialmente un programa',
      requestBody: requestBody('ProgramPatch'),
      responses: {
        200: success('Programa actualizado', 'Program', programExample),
        400: E.invalidId(),
        404: E.programNotFound,
        409: conflict(
          'El código ya existe',
          'DUPLICATE_PROGRAM_CODE',
          'Ya existe un programa con ese código',
          [{ field: 'code', message: 'Valor duplicado' }],
        ),
        422: E.validation([
          { field: '', message: 'Debe enviar al menos un campo para actualizar' },
        ]),
        ...common,
      },
    },
    delete: {
      tags: ['Programas'],
      summary: 'Eliminar un programa',
      description: 'No se puede eliminar un programa que tenga estudiantes asociados (409).',
      responses: {
        204: { description: 'Eliminado (sin contenido)' },
        400: E.invalidId(),
        404: E.programNotFound,
        409: conflict(
          'El programa tiene estudiantes asociados',
          'PROGRAM_HAS_STUDENTS',
          'No se puede eliminar el programa porque tiene estudiantes asociados',
        ),
        ...common,
      },
    },
  },

  // ===== Contactos =====
  '/api/estudiantes/{studentId}/contacto': {
    parameters: [param('StudentIdNestedPath')],
    get: {
      tags: ['Contactos'],
      summary: 'Obtener el contacto principal del estudiante',
      responses: {
        200: success('Contacto encontrado', 'Contact', contactExample),
        400: E.invalidId('studentId'),
        404: E.contactNotFound,
        ...common,
      },
    },
    post: {
      tags: ['Contactos'],
      summary: 'Crear el contacto principal (relación 1:1)',
      requestBody: requestBody('ContactInput'),
      responses: {
        201: success('Contacto creado', 'Contact', contactExample),
        400: E.invalidId('studentId'),
        404: E.studentNotFound,
        409: conflict(
          'El estudiante ya tiene contacto o el correo ya está en uso',
          'CONTACT_ALREADY_EXISTS',
          'El estudiante ya tiene un contacto principal',
        ),
        422: E.validation([{ field: 'email', message: 'Correo electrónico inválido' }]),
        ...common,
      },
    },
    put: {
      tags: ['Contactos'],
      summary: 'Reemplazar el contacto principal',
      requestBody: requestBody('ContactInput'),
      responses: {
        200: success('Contacto actualizado', 'Contact', contactExample),
        400: E.invalidId('studentId'),
        404: E.contactNotFound,
        409: conflict(
          'Correo duplicado',
          'DUPLICATE_EMAIL',
          'Ya existe un contacto registrado con ese correo',
          [{ field: 'email', message: 'Valor duplicado' }],
        ),
        422: E.validation([{ field: 'phone', message: 'Es obligatorio' }]),
        ...common,
      },
    },
    patch: {
      tags: ['Contactos'],
      summary: 'Actualizar parcialmente el contacto',
      requestBody: requestBody('ContactPatch'),
      responses: {
        200: success('Contacto actualizado', 'Contact', contactExample),
        400: E.invalidId('studentId'),
        404: E.contactNotFound,
        409: conflict(
          'Correo duplicado',
          'DUPLICATE_EMAIL',
          'Ya existe un contacto registrado con ese correo',
          [{ field: 'email', message: 'Valor duplicado' }],
        ),
        422: E.validation([
          { field: '', message: 'Debe enviar al menos un campo para actualizar' },
        ]),
        ...common,
      },
    },
    delete: {
      tags: ['Contactos'],
      summary: 'Eliminar el contacto principal',
      responses: {
        204: { description: 'Eliminado (sin contenido)' },
        400: E.invalidId('studentId'),
        404: E.contactNotFound,
        ...common,
      },
    },
  },

  // ===== Documentos =====
  '/api/estudiantes/{studentId}/documentos': {
    parameters: [param('StudentIdNestedPath')],
    get: {
      tags: ['Documentos'],
      summary: 'Listar los documentos de un estudiante',
      description: 'El documento principal aparece primero.',
      responses: {
        200: success('Documentos del estudiante', 'DocumentList', { data: [documentExample] }),
        400: E.invalidId('studentId'),
        404: E.studentNotFound,
        ...common,
      },
    },
    post: {
      tags: ['Documentos'],
      summary: 'Agregar un documento al estudiante',
      description:
        'Si `isPrimary` es true, el documento principal anterior deja de serlo (en una transacción).',
      requestBody: requestBody('DocumentCreate'),
      responses: {
        201: success('Documento creado', 'Document', documentExample),
        400: E.invalidId('studentId'),
        404: E.studentNotFound,
        409: conflict(
          'Documento duplicado',
          'DUPLICATE_DOCUMENT',
          'Ya existe un documento registrado con ese tipo y número',
          [{ field: 'number', message: 'Valor duplicado' }],
        ),
        422: E.validation([
          {
            field: 'expirationDate',
            message: 'La fecha de expiración no puede ser anterior a la de expedición',
          },
        ]),
        ...common,
      },
    },
  },
  '/api/documentos/{id}': {
    parameters: [param('DocumentIdPath')],
    get: {
      tags: ['Documentos'],
      summary: 'Obtener un documento',
      responses: {
        200: success('Documento encontrado', 'Document', documentExample),
        400: E.invalidId(),
        404: E.documentNotFound,
        ...common,
      },
    },
    put: {
      tags: ['Documentos'],
      summary: 'Reemplazar un documento',
      requestBody: requestBody('DocumentReplace'),
      responses: {
        200: success('Documento actualizado', 'Document', documentExample),
        400: E.invalidId(),
        404: E.documentNotFound,
        409: conflict(
          'Documento duplicado',
          'DUPLICATE_DOCUMENT',
          'Ya existe un documento registrado con ese tipo y número',
          [{ field: 'number', message: 'Valor duplicado' }],
        ),
        422: E.validation([{ field: 'isPrimary', message: 'Es obligatorio' }]),
        ...common,
      },
    },
    patch: {
      tags: ['Documentos'],
      summary: 'Actualizar parcialmente un documento',
      requestBody: requestBody('DocumentPatch'),
      responses: {
        200: success('Documento actualizado', 'Document', documentExample),
        400: E.invalidId(),
        404: E.documentNotFound,
        409: conflict(
          'Documento duplicado',
          'DUPLICATE_DOCUMENT',
          'Ya existe un documento registrado con ese tipo y número',
          [{ field: 'number', message: 'Valor duplicado' }],
        ),
        422: E.validation([
          { field: '', message: 'Debe enviar al menos un campo para actualizar' },
        ]),
        ...common,
      },
    },
    delete: {
      tags: ['Documentos'],
      summary: 'Eliminar un documento',
      responses: {
        204: { description: 'Eliminado (sin contenido)' },
        400: E.invalidId(),
        404: E.documentNotFound,
        ...common,
      },
    },
  },
};

module.exports = { paths, parameters };
