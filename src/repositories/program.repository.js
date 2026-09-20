const { pool } = require('../database/pool');
const { WhereBuilder, escapeLike, buildUpdateSet } = require('../utils/sql');

// Sin SELECT *: siempre se listan las columnas explícitamente.
const COLUMNS = `id, code, name, faculty, modality, status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// Lista blanca: campo público (sortBy) -> columna SQL.
const SORT_COLUMNS = {
  id: 'id',
  code: 'code',
  name: 'name',
  faculty: 'faculty',
  modality: 'modality',
  status: 'status',
  createdAt: 'created_at',
};

const UPDATABLE_COLUMNS = {
  code: 'code',
  name: 'name',
  faculty: 'faculty',
  modality: 'modality',
  status: 'status',
};

async function findAll({ filters = {}, sortBy, sortDirection, limit, offset }) {
  const sortColumn = SORT_COLUMNS[sortBy];
  if (!sortColumn) throw new Error(`Campo de ordenamiento no permitido: ${sortBy}`);
  const direction = sortDirection === 'desc' ? 'DESC' : 'ASC';

  const where = new WhereBuilder();
  if (filters.name) where.add(`name ILIKE $? ESCAPE '\\'`, `%${escapeLike(filters.name)}%`);
  if (filters.faculty)
    where.add(`faculty ILIKE $? ESCAPE '\\'`, `%${escapeLike(filters.faculty)}%`);
  if (filters.status) where.add('status = $?', filters.status);
  if (filters.modality) where.add('modality = $?', filters.modality);

  const n = where.params.length;
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM programs ${where.sql}
       ORDER BY ${sortColumn} ${direction}, id ASC
       LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...where.params, limit, offset],
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM programs ${where.sql}`, where.params),
  ]);
  return { rows: rows.rows, totalItems: count.rows[0].total };
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM programs WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function existsById(id, db = pool) {
  const { rows } = await db.query('SELECT 1 FROM programs WHERE id = $1', [id]);
  return rows.length > 0;
}

async function hasStudents(id, db = pool) {
  const { rows } = await db.query(
    'SELECT EXISTS (SELECT 1 FROM students WHERE program_id = $1) AS "hasStudents"',
    [id],
  );
  return rows[0].hasStudents;
}

async function create({ code, name, faculty, modality, status }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO programs (code, name, faculty, modality, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [code, name, faculty, modality, status],
  );
  return rows[0];
}

/** Devuelve true si el programa existía y se actualizó. */
async function update(id, changes, db = pool) {
  const { sets, params } = buildUpdateSet(UPDATABLE_COLUMNS, changes);
  if (sets.length === 0) return existsById(id, db);
  const result = await db.query(
    `UPDATE programs SET ${sets.join(', ')} WHERE id = $${params.length + 1}`,
    [...params, id],
  );
  return result.rowCount > 0;
}

async function remove(id, db = pool) {
  const result = await db.query('DELETE FROM programs WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  SORT_COLUMNS,
  findAll,
  findById,
  existsById,
  hasStudents,
  create,
  update,
  remove,
};
