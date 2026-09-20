const { pool } = require('../database/pool');
const { buildUpdateSet } = require('../utils/sql');

const COLUMNS = `id, student_id AS "studentId", email, phone, address,
  emergency_contact_name AS "emergencyContactName",
  emergency_contact_phone AS "emergencyContactPhone",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const UPDATABLE_COLUMNS = {
  email: 'email',
  phone: 'phone',
  address: 'address',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone',
};

async function findByStudentId(studentId, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM contacts WHERE student_id = $1`, [
    studentId,
  ]);
  return rows[0] ?? null;
}

async function create(studentId, data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO contacts
       (student_id, email, phone, address, emergency_contact_name, emergency_contact_phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [
      studentId,
      data.email,
      data.phone,
      data.address ?? null,
      data.emergencyContactName ?? null,
      data.emergencyContactPhone ?? null,
    ],
  );
  return rows[0];
}

/** Devuelve true si el contacto existía y se actualizó. */
async function updateByStudentId(studentId, changes, db = pool) {
  const { sets, params } = buildUpdateSet(UPDATABLE_COLUMNS, changes);
  if (sets.length === 0) return (await findByStudentId(studentId, db)) !== null;
  const result = await db.query(
    `UPDATE contacts SET ${sets.join(', ')} WHERE student_id = $${params.length + 1}`,
    [...params, studentId],
  );
  return result.rowCount > 0;
}

async function removeByStudentId(studentId, db = pool) {
  const result = await db.query('DELETE FROM contacts WHERE student_id = $1', [studentId]);
  return result.rowCount > 0;
}

module.exports = { findByStudentId, create, updateByStudentId, removeByStudentId };
