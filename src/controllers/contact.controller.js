const contactService = require('../services/contact.service');

async function get(req, res) {
  res.json(await contactService.getByStudentId(req.validated.params.studentId));
}

async function create(req, res) {
  const { studentId } = req.validated.params;
  const contact = await contactService.create(studentId, req.validated.body);
  res.status(201).location(`/api/estudiantes/${studentId}/contacto`).json(contact);
}

async function replace(req, res) {
  res.json(await contactService.replace(req.validated.params.studentId, req.validated.body));
}

async function patch(req, res) {
  res.json(await contactService.patch(req.validated.params.studentId, req.validated.body));
}

async function remove(req, res) {
  await contactService.remove(req.validated.params.studentId);
  res.status(204).send();
}

module.exports = { get, create, replace, patch, remove };
