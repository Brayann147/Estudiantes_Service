const { z } = require('zod');
const { SORT_DIRECTIONS } = require('../constants/enums');

// Mensajes de Zod en español + texto uniforme para campos faltantes.
z.config({
  ...z.locales.es(),
  customError: (issue) =>
    issue.code === 'invalid_type' && issue.input === undefined ? 'Es obligatorio' : undefined,
});

const MAX_INT4 = 2147483647; // límite de INTEGER en PostgreSQL

// Ids que llegan por URL o query string (texto -> número).
const idParam = z.coerce.number().int().positive().max(MAX_INT4);
// Ids que llegan dentro del cuerpo JSON (deben venir ya como número).
const idBody = z.number().int().positive().max(MAX_INT4);

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isoDate = z.string().refine(isRealDate, 'Fecha inválida. Formato esperado: YYYY-MM-DD');

const todayIso = () => new Date().toISOString().slice(0, 10);

// Texto obligatorio, sin espacios sobrantes y con longitud máxima.
const text = (max) =>
  z.string().trim().min(1, 'No puede estar vacío').max(max, `Máximo ${max} caracteres`);

const phone = z
  .string()
  .trim()
  .regex(
    /^\+?[0-9]{7,15}$/,
    'Teléfono inválido: use de 7 a 15 dígitos (opcionalmente con + inicial)',
  );

// En query string, "?name=" se trata como "no enviado".
const optionalQuery = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const paginationQuery = {
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortDirection: z.preprocess(
    (value) => (typeof value === 'string' ? value.toLowerCase() : value),
    z.enum(SORT_DIRECTIONS).default('asc'),
  ),
};

const hasAtLeastOneField = (obj) => Object.keys(obj).length > 0;
const AT_LEAST_ONE = { message: 'Debe enviar al menos un campo para actualizar' };

/** Convierte los issues de Zod en el arreglo `details` de la respuesta de error. */
function toDetails(issues) {
  return issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        field: [...issue.path, key].join('.'),
        message: 'Campo no permitido',
      }));
    }
    return [{ field: issue.path.join('.'), message: issue.message }];
  });
}

module.exports = {
  idParam,
  idBody,
  isoDate,
  isRealDate,
  todayIso,
  text,
  phone,
  optionalQuery,
  paginationQuery,
  hasAtLeastOneField,
  AT_LEAST_ONE,
  toDetails,
};
