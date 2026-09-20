const { Errors } = require('../errors');
const { toDetails } = require('../validators/common');

/**
 * Valida params, query y body con esquemas Zod ANTES de llegar al controlador.
 *  - params inválidos  -> 400 INVALID_ID
 *  - query inválido    -> 400 INVALID_QUERY_PARAMS
 *  - body inválido     -> 422 VALIDATION_ERROR
 * Los valores ya validados/normalizados quedan en req.validated.{params,query,body}.
 * (En Express 5 req.query es de solo lectura, por eso no se reasigna.)
 */
function validate({ params, query, body } = {}) {
  return (req, _res, next) => {
    const validated = {};

    if (params) {
      const result = params.safeParse(req.params);
      if (!result.success) throw Errors.invalidId(result.error.issues[0]?.path[0]);
      validated.params = result.data;
    }

    if (query) {
      const result = query.safeParse(req.query);
      if (!result.success) throw Errors.invalidQuery(toDetails(result.error.issues));
      validated.query = result.data;
    }

    if (body) {
      const result = body.safeParse(req.body ?? {});
      if (!result.success) throw Errors.validation(toDetails(result.error.issues));
      validated.body = result.data;
    }

    req.validated = validated;
    next();
  };
}

module.exports = validate;
