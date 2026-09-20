const programRepository = require('../repositories/program.repository');
const { Errors } = require('../errors');
const { toOffset, buildPagination } = require('../utils/pagination');

async function list(query) {
  const { pageNumber, pageSize, sortBy, sortDirection, ...filters } = query;
  const { rows, totalItems } = await programRepository.findAll({
    filters,
    sortBy,
    sortDirection,
    limit: pageSize,
    offset: toOffset(pageNumber, pageSize),
  });
  return { data: rows, pagination: buildPagination({ pageNumber, pageSize, totalItems }) };
}

async function getById(id) {
  const program = await programRepository.findById(id);
  if (!program) throw Errors.programNotFound();
  return program;
}

async function create(body) {
  return programRepository.create(body);
}

async function update(id, changes) {
  const updated = await programRepository.update(id, changes);
  if (!updated) throw Errors.programNotFound();
  return getById(id);
}

async function remove(id) {
  if (!(await programRepository.existsById(id))) throw Errors.programNotFound();
  // Regla de negocio explícita (además de la FK ON DELETE RESTRICT como red de seguridad).
  if (await programRepository.hasStudents(id)) throw Errors.programHasStudents();
  await programRepository.remove(id);
}

module.exports = { list, getById, create, update, remove };
