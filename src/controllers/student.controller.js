const studentService = require('../services/student.service');

async function list(req, res) {
  res.json(await studentService.list(req.validated.query));
}

async function getById(req, res) {
  res.json(await studentService.getById(req.validated.params.id));
}

async function create(req, res) {
  const student = await studentService.create(req.validated.body);
  res.status(201).location(`/api/estudiantes/${student.id}`).json(student);
}

async function update(req, res) {
  res.json(await studentService.update(req.validated.params.id, req.validated.body));
}

async function remove(req, res) {
  await studentService.remove(req.validated.params.id);
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
