const programService = require('../services/program.service');

async function list(req, res) {
  res.json(await programService.list(req.validated.query));
}

async function getById(req, res) {
  res.json(await programService.getById(req.validated.params.id));
}

async function create(req, res) {
  const program = await programService.create(req.validated.body);
  res.status(201).location(`/api/programas/${program.id}`).json(program);
}

async function update(req, res) {
  res.json(await programService.update(req.validated.params.id, req.validated.body));
}

async function remove(req, res) {
  await programService.remove(req.validated.params.id);
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
