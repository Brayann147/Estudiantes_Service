const studentRepository = require('../repositories/student.repository');
const programRepository = require('../repositories/program.repository');
const { Errors } = require('../errors');
const { toOffset, buildPagination } = require('../utils/pagination');

/**
 * Representación pública del estudiante.
 * Los campos `id`, `nombre` y `programa` son el CONTRATO con el API Gateway
 * (ver README, sección "Cómo se integrará con el Gateway"); el resto es información adicional.
 */
function toStudentResponse(row) {
  return {
    id: row.id,
    nombre: `${row.firstName} ${row.lastName}`,
    programa: row.programName,
    firstName: row.firstName,
    lastName: row.lastName,
    documentType: row.documentType,
    documentNumber: row.documentNumber,
    birthDate: row.birthDate,
    gender: row.gender,
    status: row.status,
    programId: row.programId,
    email: row.email ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertProgramExists(programId) {
  if (!(await programRepository.existsById(programId))) throw Errors.programNotFoundInBody();
}

async function list(query) {
  const { pageNumber, pageSize, sortBy, sortDirection, ...filters } = query;
  const { rows, totalItems } = await studentRepository.findAll({
    filters,
    sortBy,
    sortDirection,
    limit: pageSize,
    offset: toOffset(pageNumber, pageSize),
  });
  return {
    data: rows.map(toStudentResponse),
    pagination: buildPagination({ pageNumber, pageSize, totalItems }),
  };
}

async function getById(id) {
  const row = await studentRepository.findById(id);
  if (!row) throw Errors.studentNotFound();
  return toStudentResponse(row);
}

async function create(body) {
  await assertProgramExists(body.programId);
  const id = await studentRepository.create(body);
  return getById(id);
}

// PUT (reemplazo completo) y PATCH (parcial) comparten la misma lógica de actualización.
async function update(id, changes) {
  if (!(await studentRepository.existsById(id))) throw Errors.studentNotFound();
  if (changes.programId !== undefined) await assertProgramExists(changes.programId);
  const updated = await studentRepository.update(id, changes);
  if (!updated) throw Errors.studentNotFound(); // fue eliminado entre la verificación y el UPDATE
  return getById(id);
}

async function remove(id) {
  const deleted = await studentRepository.remove(id);
  if (!deleted) throw Errors.studentNotFound();
}

module.exports = { toStudentResponse, list, getById, create, update, remove };
