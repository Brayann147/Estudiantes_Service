const {
  STUDENT_DOCUMENT_TYPES,
  GENDERS,
  STUDENT_STATUSES,
  PROGRAM_STATUSES,
  MODALITIES,
  DOCUMENT_TYPES,
  STUDENT_SORT_FIELDS,
  PROGRAM_SORT_FIELDS,
} = require('../constants/enums');

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

const timestamps = {
  createdAt: { type: 'string', format: 'date-time', example: '2026-09-19T15:04:05.000Z' },
  updatedAt: { type: 'string', format: 'date-time', example: '2026-09-19T15:04:05.000Z' },
};

// ---------- Estudiante ----------
const studentFields = {
  firstName: { type: 'string', maxLength: 100, example: 'Laura' },
  lastName: { type: 'string', maxLength: 100, example: 'Gómez' },
  documentType: { type: 'string', enum: STUDENT_DOCUMENT_TYPES, example: 'CC' },
  documentNumber: {
    type: 'string',
    pattern: '^[A-Za-z0-9-]{4,20}$',
    example: '1001000012',
    description: 'Único junto con documentType',
  },
  birthDate: { type: 'string', format: 'date', example: '2002-06-08' },
  gender: { type: 'string', enum: GENDERS, example: 'female' },
  status: { type: 'string', enum: STUDENT_STATUSES, example: 'active' },
  programId: {
    type: 'integer',
    minimum: 1,
    example: 1,
    description: 'Id de un programa existente',
  },
};

const studentCreateExample = {
  firstName: 'Laura',
  lastName: 'Gómez',
  documentType: 'CC',
  documentNumber: '1001000012',
  birthDate: '2002-06-08',
  gender: 'female',
  programId: 1,
};

const studentExample = {
  id: 12,
  nombre: 'Laura Gómez',
  programa: 'Ingeniería de Sistemas',
  firstName: 'Laura',
  lastName: 'Gómez',
  documentType: 'CC',
  documentNumber: '1001000012',
  birthDate: '2002-06-08',
  gender: 'female',
  status: 'active',
  programId: 1,
  email: 'laura.gomez@example.com',
  foto: {
    originalName: 'laura.png',
    contentType: 'image/png',
    sizeBytes: 184320,
    uploadedAt: '2026-11-02T15:04:05.000Z',
  },
  fotoUrl:
    'https://estudiantes-fotos.s3.us-east-1.amazonaws.com/estudiantes/12/3f2c9a1e.png?X-Amz-Expires=600&X-Amz-Signature=...',
  createdAt: '2026-09-19T15:04:05.000Z',
  updatedAt: '2026-09-19T15:04:05.000Z',
};

// ---------- Programa ----------
const programFields = {
  code: { type: 'string', pattern: '^[A-Z0-9-]{2,20}$', example: 'ISIS', description: 'Único' },
  name: { type: 'string', maxLength: 150, example: 'Ingeniería de Sistemas' },
  faculty: { type: 'string', maxLength: 150, example: 'Facultad de Ingeniería' },
  modality: { type: 'string', enum: MODALITIES, example: 'onsite' },
  status: { type: 'string', enum: PROGRAM_STATUSES, example: 'active' },
};

const programExample = {
  id: 1,
  code: 'ISIS',
  name: 'Ingeniería de Sistemas',
  faculty: 'Facultad de Ingeniería',
  modality: 'onsite',
  status: 'active',
  createdAt: '2026-09-19T15:04:05.000Z',
  updatedAt: '2026-09-19T15:04:05.000Z',
};

// ---------- Contacto ----------
const phone = { type: 'string', pattern: '^\\+?[0-9]{7,15}$', example: '3101234567' };
const contactFields = {
  email: { type: 'string', format: 'email', maxLength: 254, example: 'laura.gomez@example.com' },
  phone,
  address: { type: 'string', nullable: true, maxLength: 255, example: 'Calle 10 # 5-20, Tunja' },
  emergencyContactName: { type: 'string', nullable: true, maxLength: 100, example: 'Marta Gómez' },
  emergencyContactPhone: { ...phone, nullable: true, example: '3209876543' },
};

const contactInputExample = {
  email: 'laura.gomez@example.com',
  phone: '3101234567',
  address: 'Calle 10 # 5-20, Tunja',
  emergencyContactName: 'Marta Gómez',
  emergencyContactPhone: '3209876543',
};

const contactExample = {
  id: 7,
  studentId: 12,
  ...contactInputExample,
  ...{
    createdAt: '2026-09-19T15:04:05.000Z',
    updatedAt: '2026-09-19T15:04:05.000Z',
  },
};

// ---------- Documento ----------
const documentFields = {
  type: { type: 'string', enum: DOCUMENT_TYPES, example: 'STUDENT_ID' },
  number: {
    type: 'string',
    pattern: '^[A-Za-z0-9-]{3,30}$',
    example: 'UPTC-00012',
    description: 'Único junto con type',
  },
  issueDate: { type: 'string', format: 'date', nullable: true, example: '2024-02-01' },
  expirationDate: {
    type: 'string',
    format: 'date',
    nullable: true,
    example: '2028-01-31',
    description: 'No puede ser anterior a issueDate',
  },
  isPrimary: {
    type: 'boolean',
    example: false,
    description: 'Solo un documento por estudiante puede ser principal',
  },
};

const documentInputExample = {
  type: 'STUDENT_ID',
  number: 'UPTC-00012',
  issueDate: '2024-02-01',
  expirationDate: '2028-01-31',
  isPrimary: false,
};

const documentExample = {
  id: 31,
  studentId: 12,
  ...documentInputExample,
  createdAt: '2026-09-19T15:04:05.000Z',
  updatedAt: '2026-09-19T15:04:05.000Z',
};

const paginationExample = { pageNumber: 1, pageSize: 10, totalItems: 25, totalPages: 3 };

const schemas = {
  // --- Estudiante ---
  Student: {
    type: 'object',
    description:
      'Estudiante. Los campos `id`, `nombre` y `programa` son el contrato mínimo que consume el API Gateway.',
    required: ['id', 'nombre', 'programa', ...Object.keys(studentFields), 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', example: 12 },
      nombre: { type: 'string', example: 'Laura Gómez', description: 'firstName + " " + lastName' },
      programa: {
        type: 'string',
        example: 'Ingeniería de Sistemas',
        description: 'Nombre del programa del estudiante',
      },
      ...studentFields,
      email: {
        type: 'string',
        format: 'email',
        nullable: true,
        example: 'laura.gomez@example.com',
        description: 'Correo del contacto principal (null si aún no tiene contacto)',
      },
      foto: { allOf: [ref('PhotoMetadata')], nullable: true },
      fotoUrl: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description:
          'URL temporal firmada para ver la foto (el bucket es privado). Vence en PHOTO_URL_TTL_SECONDS; null si no tiene foto.',
      },
      ...timestamps,
    },
    example: studentExample,
  },
  PhotoMetadata: {
    type: 'object',
    description:
      'Metadatos guardados en la base de datos. El archivo vive en el almacenamiento de objetos, nunca en la base.',
    required: ['originalName', 'contentType', 'sizeBytes', 'uploadedAt'],
    properties: {
      originalName: { type: 'string', example: 'laura.png' },
      contentType: { type: 'string', enum: ['image/jpeg', 'image/png'], example: 'image/png' },
      sizeBytes: { type: 'integer', maximum: 2097152, example: 184320 },
      uploadedAt: { type: 'string', format: 'date-time', example: '2026-11-02T15:04:05.000Z' },
    },
  },
  PhotoUpload: {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary', description: 'Imagen JPG o PNG, máximo 2 MB' },
    },
  },
  PhotoUrl: {
    type: 'object',
    required: ['url', 'expiresIn'],
    properties: {
      url: { type: 'string', format: 'uri' },
      expiresIn: { type: 'integer', description: 'Segundos de validez de la URL', example: 600 },
    },
    example: { url: studentExample.fotoUrl, expiresIn: 600 },
  },
  StudentGatewayContract: {
    type: 'object',
    description:
      'Subconjunto mínimo garantizado de GET /api/estudiantes/{id} que usará el Gateway en /api/estudiantes/{id}/detalle.',
    required: ['id', 'nombre', 'programa'],
    properties: pick(
      {
        id: { type: 'integer', example: 12 },
        nombre: { type: 'string', example: 'Laura Gómez' },
        programa: { type: 'string', example: 'Ingeniería de Sistemas' },
      },
      ['id', 'nombre', 'programa'],
    ),
    example: { id: 12, nombre: 'Laura Gómez', programa: 'Ingeniería de Sistemas' },
  },
  StudentCreate: {
    type: 'object',
    additionalProperties: false,
    required: [
      'firstName',
      'lastName',
      'documentType',
      'documentNumber',
      'birthDate',
      'gender',
      'programId',
    ],
    properties: {
      ...studentFields,
      status: { ...studentFields.status, default: 'active' },
    },
    example: studentCreateExample,
  },
  StudentReplace: {
    type: 'object',
    additionalProperties: false,
    description: 'Reemplazo completo: todos los campos son obligatorios.',
    required: Object.keys(studentFields),
    properties: studentFields,
    example: { ...studentCreateExample, status: 'active' },
  },
  StudentPatch: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    description: 'Actualización parcial: envíe al menos un campo.',
    properties: studentFields,
    example: { status: 'inactive' },
  },
  PaginatedStudents: {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: { type: 'array', items: ref('Student') },
      pagination: ref('Pagination'),
    },
    example: { data: [studentExample], pagination: paginationExample },
  },

  // --- Programa ---
  Program: {
    type: 'object',
    required: ['id', ...Object.keys(programFields), 'createdAt', 'updatedAt'],
    properties: { id: { type: 'integer', example: 1 }, ...programFields, ...timestamps },
    example: programExample,
  },
  ProgramCreate: {
    type: 'object',
    additionalProperties: false,
    required: ['code', 'name', 'faculty', 'modality'],
    properties: { ...programFields, status: { ...programFields.status, default: 'active' } },
    example: {
      code: 'ISIS',
      name: 'Ingeniería de Sistemas',
      faculty: 'Facultad de Ingeniería',
      modality: 'onsite',
    },
  },
  ProgramReplace: {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(programFields),
    properties: programFields,
    example: pick(programExample, Object.keys(programFields)),
  },
  ProgramPatch: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: programFields,
    example: { status: 'inactive' },
  },
  PaginatedPrograms: {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: { type: 'array', items: ref('Program') },
      pagination: ref('Pagination'),
    },
    example: {
      data: [programExample],
      pagination: { ...paginationExample, totalItems: 7, totalPages: 1 },
    },
  },

  // --- Contacto ---
  Contact: {
    type: 'object',
    required: ['id', 'studentId', 'email', 'phone', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', example: 7 },
      studentId: { type: 'integer', example: 12 },
      ...contactFields,
      ...timestamps,
    },
    example: contactExample,
  },
  ContactInput: {
    type: 'object',
    additionalProperties: false,
    description: 'Cuerpo de POST y PUT. Los campos opcionales omitidos quedan en null.',
    required: ['email', 'phone'],
    properties: contactFields,
    example: contactInputExample,
  },
  ContactPatch: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: contactFields,
    example: { phone: '3111111111' },
  },

  // --- Documento ---
  Document: {
    type: 'object',
    required: ['id', 'studentId', 'type', 'number', 'isPrimary', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', example: 31 },
      studentId: { type: 'integer', example: 12 },
      ...documentFields,
      ...timestamps,
    },
    example: documentExample,
  },
  DocumentCreate: {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'number'],
    properties: { ...documentFields, isPrimary: { ...documentFields.isPrimary, default: false } },
    example: documentInputExample,
  },
  DocumentReplace: {
    type: 'object',
    additionalProperties: false,
    description:
      'Reemplazo completo: type, number e isPrimary obligatorios; las fechas omitidas quedan en null.',
    required: ['type', 'number', 'isPrimary'],
    properties: documentFields,
    example: documentInputExample,
  },
  DocumentPatch: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: documentFields,
    example: { isPrimary: true },
  },
  DocumentList: {
    type: 'object',
    required: ['data'],
    properties: { data: { type: 'array', items: ref('Document') } },
    example: { data: [documentExample] },
  },

  // --- Comunes ---
  Pagination: {
    type: 'object',
    required: ['pageNumber', 'pageSize', 'totalItems', 'totalPages'],
    properties: {
      pageNumber: { type: 'integer', example: 1 },
      pageSize: { type: 'integer', example: 10 },
      totalItems: { type: 'integer', example: 25 },
      totalPages: { type: 'integer', example: 3 },
    },
  },
  ErrorResponse: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message', 'details'],
        properties: {
          code: {
            type: 'string',
            example: 'STUDENT_NOT_FOUND',
            description: 'Código estable para programas',
          },
          message: { type: 'string', example: 'El estudiante solicitado no existe' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'documentNumber' },
                message: { type: 'string', example: 'Valor duplicado' },
              },
            },
          },
        },
      },
    },
  },
  Health: {
    type: 'object',
    required: ['status', 'service', 'database'],
    properties: {
      status: { type: 'string', enum: ['ok', 'error'], example: 'ok' },
      service: { type: 'string', example: 'estudiantes-service' },
      version: { type: 'string', example: '1.0.0' },
      timestamp: { type: 'string', format: 'date-time' },
      database: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['up', 'down'], example: 'up' } },
      },
    },
  },
};

const sortFields = { student: STUDENT_SORT_FIELDS, program: PROGRAM_SORT_FIELDS };

module.exports = {
  schemas,
  sortFields,
  studentExample,
  programExample,
  contactExample,
  documentExample,
  paginationExample,
  studentCreateExample,
  contactInputExample,
  documentInputExample,
};
