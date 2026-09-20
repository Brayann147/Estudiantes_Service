const { Errors } = require('../errors');

function notFound(req, _res, next) {
  next(Errors.routeNotFound(req.method, req.originalUrl.split('?')[0]));
}

module.exports = notFound;
