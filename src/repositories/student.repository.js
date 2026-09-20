const { pool } = require('../database/pool');
const { WhereBuilder, escapeLike, buildUpdateSet } = require('../utils/sql');

// Columnas explícitas (sin SELECT *). "programName" y "email" vienen de los JOIN.
const COLUMNS = `s.id, s.first_name AS "firstName", s.last_name AS "lastName",
  s.document_type AS "documentType", s.document_number AS "documentNumber",
  s.birth_date AS "birthDate", s.gender, s.status, s.program_id AS "programId",
  p.name AS "programName", c.email,
  s.created_at AS "createdAt", s.updated_at AS "updatedAt"`;

const FROM = `FROM students s
  JOIN programs p ON p.id = s.program_id
  LEFT JOIN contacts c ON c.student_id = s.id`;

// Lista blanca: campo público (sortBy) -> columna SQL. Nada del cliente se concatena al SQL.
const SORT_COLUMNS = {
  id: 's.id',
  firstName: 's.first_name',
  lastName: 's.last_name',
  documentNumber: 's.document_number',
  birthDate: 's.birth_date',
  status: 's.status',
  programId: 's.program_id',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
};

const UPDATABLE_COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  documentType: 'document_type',
  documentNumber: 'document_number',
  birthDate: 'birth_date',
  gender: 'gender',
  status: 'status',
  programId: 'program_id',
};

async function findAll({ filters = {}, sortBy, sortDirection, limit, offset }) {
  const sortColumn = SORT_COLUMNS[sortBy];
  if (!sortColumn) throw new Error(`Campo de ordenamiento no permitido: ${sortBy}`);
  const direction = sortDirection === 'desc' ? 'DESC' : 'ASC';

  const where = new WhereBuilder();
  if (filters.name) {
    where.add(
      `(s.first_name || ' ' || s.last_name) ILIKE $? ESCAPE '\\'`,
      `%${escapeLike(filters.name)}%`,
    );
  }
  if (filters.programId !== undefined) where.add('s.program_id = $?', filters.programId);
  if (filters.status) where.add('s.status = $?', filters.status);
  if (filters.documentNumber) where.add('s.document_number = $?', filters.documentNumber);
  if (filters.email) where.add('lower(c.email) = $?', filters.email.toLowerCase());

  const n = where.params.length;
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} ${FROM} ${where.sql}
       ORDER BY ${sortColumn} ${direction}, s.id ASC
       LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...where.params, limit, offset],
    ),
    pool.query(`SELECT COUNT(*)::int AS total ${FROM} ${where.sql}`, where.params),
  ]);
  return { rows: rows.rows, totalItems: count.rows[0].total };
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} ${FROM} WHERE s.id = $1`, [id]);
  return rows[0] ?? null;
}

async function existsById(id, db = pool) {
  const { rows } = await db.query('SELECT 1 FROM students WHERE id = $1', [id]);
  return rows.length > 0;
}

/** Inserta y devuelve el id generado. */
async function create(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO students
       (first_name, last_name, document_type, document_number, birth_date, gender, status, program_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.firstName,
      data.lastName,
      data.documentType,
      data.documentNumber,
      data.birthDate,
      data.gender,
      data.status,
      data.programId,
    ],
  );
  return rows[0].id;
}

/** Devuelve true si el estudiante existía y se actualizó. */
async function update(id, changes, db = pool) {
  const { sets, params } = buildUpdateSet(UPDATABLE_COLUMNS, changes);
  if (sets.length === 0) return existsById(id, db);
  const result = await db.query(
    `UPDATE students SET ${sets.join(', ')} WHERE id = $${params.length + 1}`,
    [...params, id],
  );
  return result.rowCount > 0;
}

/** Elimina al estudiante; contactos y documentos se eliminan en cascada (ON DELETE CASCADE). */
async function remove(id, db = pool) {
  const result = await db.query('DELETE FROM students WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { SORT_COLUMNS, findAll, findById, existsById, create, update, remove };
