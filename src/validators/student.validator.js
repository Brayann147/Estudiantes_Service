const { z } = require('zod');
const {
  STUDENT_DOCUMENT_TYPES,
  GENDERS,
  STUDENT_STATUSES,
  STUDENT_SORT_FIELDS,
} = require('../constants/enums');
const {
  idParam,
  idBody,
  isoDate,
  todayIso,
  text,
  optionalQuery,
  paginationQuery,
  hasAtLeastOneField,
  AT_LEAST_ONE,
} = require('./common');

const birthDate = isoDate
  .refine((d) => d >= '1900-01-01', 'La fecha de nacimiento es demasiado antigua')
  .refine((d) => d <= todayIso(), 'La fecha de nacimiento no puede ser futura');

const shape = {
  firstName: text(100),
  lastName: text(100),
  documentType: z.enum(STUDENT_DOCUMENT_TYPES),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,20}$/, 'Debe tener de 4 a 20 caracteres alfanuméricos (se permite -)'),
  birthDate,
  gender: z.enum(GENDERS),
  status: z.enum(STUDENT_STATUSES),
  programId: idBody,
};

// POST: el estado es opcional (por defecto "active").
const createStudentBody = z.strictObject({ ...shape, status: shape.status.default('active') });
// PUT: reemplazo completo, todos los campos son obligatorios.
const replaceStudentBody = z.strictObject(shape);
// PATCH: actualización parcial, al menos un campo.
const patchStudentBody = z.strictObject(shape).partial().refine(hasAtLeastOneField, AT_LEAST_ONE);

const studentIdParams = z.object({ id: idParam });
const studentIdNestedParams = z.object({ studentId: idParam });

const listStudentsQuery = z.object({
  ...paginationQuery,
  sortBy: z.enum(STUDENT_SORT_FIELDS).default('id'),
  // filtros
  name: optionalQuery(z.string().trim().min(1).max(100)),
  programId: optionalQuery(idParam),
  status: optionalQuery(z.enum(STUDENT_STATUSES)),
  documentNumber: optionalQuery(z.string().trim().min(1).max(20)),
  email: optionalQuery(z.string().trim().toLowerCase().max(254).pipe(z.email())),
});

module.exports = {
  createStudentBody,
  replaceStudentBody,
  patchStudentBody,
  studentIdParams,
  studentIdNestedParams,
  listStudentsQuery,
};
