const contactRepository = require('../repositories/contact.repository');
const studentRepository = require('../repositories/student.repository');
const { Errors } = require('../errors');

async function assertStudentExists(studentId) {
  if (!(await studentRepository.existsById(studentId))) throw Errors.studentNotFound();
}

async function getByStudentId(studentId) {
  await assertStudentExists(studentId);
  const contact = await contactRepository.findByStudentId(studentId);
  if (!contact) throw Errors.contactNotFound();
  return contact;
}

async function create(studentId, body) {
  await assertStudentExists(studentId);
  if (await contactRepository.findByStudentId(studentId)) throw Errors.contactAlreadyExists();
  return contactRepository.create(studentId, body);
}

// PUT: reemplazo completo. Los campos opcionales que no se envían quedan en NULL.
async function replace(studentId, body) {
  await assertStudentExists(studentId);
  const full = {
    email: body.email,
    phone: body.phone,
    address: body.address ?? null,
    emergencyContactName: body.emergencyContactName ?? null,
    emergencyContactPhone: body.emergencyContactPhone ?? null,
  };
  const updated = await contactRepository.updateByStudentId(studentId, full);
  if (!updated) throw Errors.contactNotFound();
  return contactRepository.findByStudentId(studentId);
}

async function patch(studentId, changes) {
  await assertStudentExists(studentId);
  const updated = await contactRepository.updateByStudentId(studentId, changes);
  if (!updated) throw Errors.contactNotFound();
  return contactRepository.findByStudentId(studentId);
}

async function remove(studentId) {
  await assertStudentExists(studentId);
  const deleted = await contactRepository.removeByStudentId(studentId);
  if (!deleted) throw Errors.contactNotFound();
}

module.exports = { getByStudentId, create, replace, patch, remove };
