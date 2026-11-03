const { randomUUID } = require('node:crypto');
const studentRepository = require('../repositories/student.repository');
const programRepository = require('../repositories/program.repository');
const photoStorage = require('../storage/photoStorage');
const logger = require('../config/logger');
const { Errors } = require('../errors');
const { toOffset, buildPagination } = require('../utils/pagination');
const { detectImageType } = require('../utils/imageType');

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
    foto: row.photoKey
      ? {
          originalName: row.photoOriginalName,
          contentType: row.photoContentType,
          sizeBytes: row.photoSizeBytes,
          uploadedAt: row.photoUploadedAt,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Agrega `fotoUrl`: URL temporal firmada (el bucket es privado). Se genera en cada lectura, nunca se guarda. */
async function withPhotoUrl(row) {
  const student = toStudentResponse(row);
  student.fotoUrl = row.photoKey ? await photoStorage.signedPhotoUrl(row.photoKey) : null;
  return student;
}

/** Borrar el objeto viejo es limpieza: si falla, se registra pero no se rompe la operación del usuario. */
async function deleteObjectQuietly(key) {
  try {
    await photoStorage.deletePhoto(key);
  } catch (err) {
    logger.warn('No se pudo borrar la foto anterior en S3', { key, error: err.message });
  }
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
    data: await Promise.all(rows.map(withPhotoUrl)),
    pagination: buildPagination({ pageNumber, pageSize, totalItems }),
  };
}

async function getById(id) {
  const row = await studentRepository.findById(id);
  if (!row) throw Errors.studentNotFound();
  return withPhotoUrl(row);
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
  const { deleted, photoKey } = await studentRepository.remove(id);
  if (!deleted) throw Errors.studentNotFound();
  if (photoKey) await deleteObjectQuietly(photoKey);
}

/**
 * Sube o reemplaza la foto. Orden: 1) validar, 2) subir el objeto nuevo con clave única,
 * 3) guardar metadatos, 4) borrar el objeto anterior. Si el paso 3 falla, se borra el objeto
 * recién subido para no dejar archivos huérfanos en el bucket.
 */
async function uploadPhoto(id, file) {
  if (!file?.buffer?.length) throw Errors.photoRequired();
  const type = detectImageType(file.buffer);
  if (!type) throw Errors.unsupportedPhotoType();
  if (!(await studentRepository.existsById(id))) throw Errors.studentNotFound();

  const key = `estudiantes/${id}/${randomUUID()}.${type.extension}`;
  try {
    await photoStorage.putPhoto(key, file.buffer, type.contentType);
  } catch (err) {
    logger.error('No se pudo subir la foto a S3', { key, error: err.message });
    throw Errors.storageUnavailable();
  }

  let oldKey;
  try {
    oldKey = await studentRepository.setPhoto(id, {
      key,
      originalName: (file.originalname || `foto.${type.extension}`).slice(0, 255),
      contentType: type.contentType,
      sizeBytes: file.buffer.length,
    });
  } catch (err) {
    await deleteObjectQuietly(key);
    throw err;
  }
  if (oldKey === undefined) {
    await deleteObjectQuietly(key); // el estudiante se eliminó mientras se subía
    throw Errors.studentNotFound();
  }
  if (oldKey) await deleteObjectQuietly(oldKey);
  return getById(id);
}

async function getPhotoUrl(id) {
  const row = await studentRepository.findById(id);
  if (!row) throw Errors.studentNotFound();
  if (!row.photoKey) throw Errors.photoNotFound();
  return {
    url: await photoStorage.signedPhotoUrl(row.photoKey),
    expiresIn: photoStorage.urlTtlSeconds,
  };
}

async function deletePhoto(id) {
  const oldKey = await studentRepository.clearPhoto(id);
  if (oldKey === undefined) throw Errors.studentNotFound();
  if (oldKey === null) throw Errors.photoNotFound();
  await deleteObjectQuietly(oldKey);
}

module.exports = {
  toStudentResponse,
  list,
  getById,
  create,
  update,
  remove,
  uploadPhoto,
  getPhotoUrl,
  deletePhoto,
};
