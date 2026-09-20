const { z } = require('zod');
const { PROGRAM_STATUSES, MODALITIES, PROGRAM_SORT_FIELDS } = require('../constants/enums');
const {
  idParam,
  text,
  optionalQuery,
  paginationQuery,
  hasAtLeastOneField,
  AT_LEAST_ONE,
} = require('./common');

const shape = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, 'Debe tener de 2 a 20 caracteres alfanuméricos (se permite -)'),
  name: text(150),
  faculty: text(150),
  modality: z.enum(MODALITIES),
  status: z.enum(PROGRAM_STATUSES),
};

const createProgramBody = z.strictObject({ ...shape, status: shape.status.default('active') });
const replaceProgramBody = z.strictObject(shape);
const patchProgramBody = z.strictObject(shape).partial().refine(hasAtLeastOneField, AT_LEAST_ONE);

const programIdParams = z.object({ id: idParam });

const listProgramsQuery = z.object({
  ...paginationQuery,
  sortBy: z.enum(PROGRAM_SORT_FIELDS).default('id'),
  name: optionalQuery(z.string().trim().min(1).max(150)),
  faculty: optionalQuery(z.string().trim().min(1).max(150)),
  status: optionalQuery(z.enum(PROGRAM_STATUSES)),
  modality: optionalQuery(z.enum(MODALITIES)),
});

module.exports = {
  createProgramBody,
  replaceProgramBody,
  patchProgramBody,
  programIdParams,
  listProgramsQuery,
};
