const documentRepository = require('../repositories/document.repository');
const studentRepository = require('../repositories/student.repository');
const { withTransaction } = require('../database/pool');
const { Errors } = require('../errors');
const { datesInOrder, DATE_ORDER } = require('../validators/document.validator');

async function assertStudentExists(studentId) {
  if (!(await studentRepository.existsById(studentId))) throw Errors.studentNotFound();
}

async function getExisting(id) {
  const document = await documentRepository.findById(id);
  if (!document) throw Errors.documentNotFound();
  return document;
}

async function listByStudent(studentId) {
  await assertStudentExists(studentId);
  return { data: await documentRepository.findByStudentId(studentId) };
}

async function getById(id) {
  return getExisting(id);
}

async function create(studentId, body) {
  await assertStudentExists(studentId);
  // Transacción: si el nuevo documento es principal, se desmarca el anterior y se inserta
  // de forma atómica (nunca quedan dos principales ni ninguno por un fallo a la mitad).
  const id = await withTransaction(async (client) => {
    if (body.isPrimary) await documentRepository.unsetPrimary(studentId, null, client);
    return documentRepository.create(studentId, body, client);
  });
  return documentRepository.findById(id);
}

async function update(id, changes) {
  const existing = await getExisting(id);

  // En PATCH las fechas se validan contra los valores ya guardados.
  if (!datesInOrder({ ...existing, ...changes })) {
    throw Errors.validation([{ field: 'expirationDate', message: DATE_ORDER.message }]);
  }

  await withTransaction(async (client) => {
    if (changes.isPrimary === true) {
      await documentRepository.unsetPrimary(existing.studentId, id, client);
    }
    await documentRepository.update(id, changes, client);
  });
  return documentRepository.findById(id);
}

// PUT: reemplazo completo; las fechas omitidas quedan en NULL.
async function replace(id, body) {
  return update(id, {
    type: body.type,
    number: body.number,
    issueDate: body.issueDate ?? null,
    expirationDate: body.expirationDate ?? null,
    isPrimary: body.isPrimary,
  });
}

async function remove(id) {
  const deleted = await documentRepository.remove(id);
  if (!deleted) throw Errors.documentNotFound();
}

module.exports = { listByStudent, getById, create, update, replace, remove };
