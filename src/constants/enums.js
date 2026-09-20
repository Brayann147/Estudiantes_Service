// Valores permitidos. Se usan en validadores (Zod), en la documentación Swagger
// y deben coincidir con los CHECK de las migraciones.

const STUDENT_DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'PASSPORT'];
const GENDERS = ['female', 'male', 'other'];
const STUDENT_STATUSES = ['active', 'inactive', 'graduated', 'suspended'];

const PROGRAM_STATUSES = ['active', 'inactive'];
const MODALITIES = ['onsite', 'online', 'hybrid'];

const DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'PASSPORT', 'BIRTH_CERTIFICATE', 'STUDENT_ID', 'OTHER'];

const SORT_DIRECTIONS = ['asc', 'desc'];

// Listas blancas de campos por los que se puede ordenar (la traducción a columnas
// SQL vive en cada repositorio; nunca se interpola texto del cliente en el ORDER BY).
const STUDENT_SORT_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'documentNumber',
  'birthDate',
  'status',
  'programId',
  'createdAt',
  'updatedAt',
];
const PROGRAM_SORT_FIELDS = ['id', 'code', 'name', 'faculty', 'modality', 'status', 'createdAt'];

module.exports = {
  STUDENT_DOCUMENT_TYPES,
  GENDERS,
  STUDENT_STATUSES,
  PROGRAM_STATUSES,
  MODALITIES,
  DOCUMENT_TYPES,
  SORT_DIRECTIONS,
  STUDENT_SORT_FIELDS,
  PROGRAM_SORT_FIELDS,
};
