const { z } = require('zod');
const { text, phone, hasAtLeastOneField, AT_LEAST_ONE } = require('./common');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Máximo 254 caracteres')
  .pipe(z.email('Correo electrónico inválido'));

const shape = {
  email,
  phone,
  address: text(255).nullish(),
  emergencyContactName: text(100).nullish(),
  emergencyContactPhone: phone.nullish(),
};

// POST y PUT: email y phone obligatorios; el resto es opcional (si falta, queda en NULL).
const contactBody = z.strictObject(shape);
const patchContactBody = z.strictObject(shape).partial().refine(hasAtLeastOneField, AT_LEAST_ONE);

module.exports = { contactBody, patchContactBody };
