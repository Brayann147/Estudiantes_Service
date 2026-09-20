const { pool } = require('../database/pool');
const { buildUpdateSet } = require('../utils/sql');

const COLUMNS = `id, student_id AS "studentId", type, number,
  issue_date AS "issueDate", expiration_date AS "expirationDate", is_primary AS "isPrimary",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const UPDATABLE_COLUMNS = {
  type: 'type',
  number: 'number',
  issueDate: 'issue_date',
  expirationDate: 'expiration_date',
  isPrimary: 'is_primary',
};

async function findByStudentId(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM documents WHERE student_id = $1 ORDER BY is_primary DESC, id ASC`,
    [studentId],
  );
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM documents WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Inserta y devuelve el id generado. */
async function create(studentId, data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO documents (student_id, type, number, issue_date, expiration_date, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      studentId,
      data.type,
      data.number,
      data.issueDate ?? null,
      data.expirationDate ?? null,
      data.isPrimary ?? false,
    ],
  );
  return rows[0].id;
}

/** Devuelve true si el documento existía y se actualizó. */
async function update(id, changes, db = pool) {
  const { sets, params } = buildUpdateSet(UPDATABLE_COLUMNS, changes);
  if (sets.length === 0) return (await findById(id, db)) !== null;
  const result = await db.query(
    `UPDATE documents SET ${sets.join(', ')} WHERE id = $${params.length + 1}`,
    [...params, id],
  );
  return result.rowCount > 0;
}

/** Quita la marca de "principal" a los demás documentos del estudiante. */
async function unsetPrimary(studentId, exceptId, db = pool) {
  await db.query(
    `UPDATE documents SET is_primary = false
     WHERE student_id = $1 AND is_primary AND ($2::int IS NULL OR id <> $2)`,
    [studentId, exceptId],
  );
}

async function remove(id, db = pool) {
  const result = await db.query('DELETE FROM documents WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { findByStudentId, findById, create, update, unsetPrimary, remove };
