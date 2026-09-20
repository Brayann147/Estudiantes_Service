const healthService = require('../services/health.service');

async function health(_req, res) {
  const { httpStatus, body } = await healthService.check();
  res.status(httpStatus).json(body);
}

module.exports = { health };
