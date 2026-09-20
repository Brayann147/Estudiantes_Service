const documentService = require('../services/document.service');

async function listByStudent(req, res) {
  res.json(await documentService.listByStudent(req.validated.params.studentId));
}

async function getById(req, res) {
  res.json(await documentService.getById(req.validated.params.id));
}

async function create(req, res) {
  const document = await documentService.create(req.validated.params.studentId, req.validated.body);
  res.status(201).location(`/api/documentos/${document.id}`).json(document);
}

async function replace(req, res) {
  res.json(await documentService.replace(req.validated.params.id, req.validated.body));
}

async function patch(req, res) {
  res.json(await documentService.update(req.validated.params.id, req.validated.body));
}

async function remove(req, res) {
  await documentService.remove(req.validated.params.id);
  res.status(204).send();
}

module.exports = { listByStudent, getById, create, replace, patch, remove };
