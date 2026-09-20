const { z } = require('zod');
const { DOCUMENT_TYPES } = require('../constants/enums');
const { idParam, isoDate, hasAtLeastOneField, AT_LEAST_ONE } = require('./common');

/** Regla de negocio: la expiración no puede ser anterior a la expedición. */
const datesInOrder = ({ issueDate, expirationDate }) =>
  !issueDate || !expirationDate || expirationDate >= issueDate;

const DATE_ORDER = {
  message: 'La fecha de expiración no puede ser anterior a la de expedición',
  path: ['expirationDate'],
};

const shape = {
  type: z.enum(DOCUMENT_TYPES),
  number: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,30}$/, 'Debe tener de 3 a 30 caracteres alfanuméricos (se permite -)'),
  issueDate: isoDate.nullish(),
  expirationDate: isoDate.nullish(),
  isPrimary: z.boolean(),
};

const createDocumentBody = z
  .strictObject({ ...shape, isPrimary: shape.isPrimary.default(false) })
  .refine(datesInOrder, DATE_ORDER);
const replaceDocumentBody = z.strictObject(shape).refine(datesInOrder, DATE_ORDER);
const patchDocumentBody = z
  .strictObject(shape)
  .partial()
  .refine(hasAtLeastOneField, AT_LEAST_ONE)
  .refine(datesInOrder, DATE_ORDER);

const documentIdParams = z.object({ id: idParam });

module.exports = {
  createDocumentBody,
  replaceDocumentBody,
  patchDocumentBody,
  documentIdParams,
  datesInOrder,
  DATE_ORDER,
};
