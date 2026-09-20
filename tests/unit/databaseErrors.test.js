const { mapDatabaseError, isConnectionError } = require('../../src/errors/databaseErrors');

const pgError = (code, extra = {}) => Object.assign(new Error('pg error'), { code, ...extra });

describe('errors/databaseErrors', () => {
  describe('violaciones de unicidad (23505)', () => {
    it.each([
      ['uq_students_document', 409, 'DUPLICATE_DOCUMENT_NUMBER'],
      ['uq_contacts_email', 409, 'DUPLICATE_EMAIL'],
      ['uq_contacts_student', 409, 'CONTACT_ALREADY_EXISTS'],
      ['uq_documents_type_number', 409, 'DUPLICATE_DOCUMENT'],
      ['uq_programs_code', 409, 'DUPLICATE_PROGRAM_CODE'],
      ['otra_restriccion', 409, 'DB_CONSTRAINT_VIOLATION'],
    ])('%s -> %i %s', (constraint, status, code) => {
      const mapped = mapDatabaseError(pgError('23505', { constraint }));
      expect(mapped.status).toBe(status);
      expect(mapped.code).toBe(code);
    });
  });

  describe('llaves foráneas (23503)', () => {
    it('programa inexistente al insertar estudiante -> 422 PROGRAM_NOT_FOUND', () => {
      const mapped = mapDatabaseError(
        pgError('23503', {
          constraint: 'fk_students_program',
          detail: 'Key (program_id)=(99) is not present in table "programs".',
        }),
      );
      expect(mapped.status).toBe(422);
      expect(mapped.code).toBe('PROGRAM_NOT_FOUND');
    });

    it('eliminar programa referenciado -> 409 PROGRAM_HAS_STUDENTS', () => {
      const mapped = mapDatabaseError(
        pgError('23503', {
          constraint: 'fk_students_program',
          detail: 'Key (id)=(1) is still referenced from table "students".',
        }),
      );
      expect(mapped.status).toBe(409);
      expect(mapped.code).toBe('PROGRAM_HAS_STUDENTS');
    });
  });

  it('mapea otras restricciones a 422 o 409', () => {
    expect(mapDatabaseError(pgError('23502', { column: 'email' })).status).toBe(422);
    expect(mapDatabaseError(pgError('23514', { constraint: 'ck_x' })).status).toBe(422);
    expect(mapDatabaseError(pgError('22001')).status).toBe(422);
    expect(mapDatabaseError(pgError('22P02')).status).toBe(422);
    expect(mapDatabaseError(pgError('23000')).code).toBe('DB_CONSTRAINT_VIOLATION');
  });

  describe('errores de conexión', () => {
    it.each(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '08006', '53300'])(
      'el código %s se traduce a 503 DATABASE_UNAVAILABLE',
      (code) => {
        const mapped = mapDatabaseError(pgError(code));
        expect(mapped.status).toBe(503);
        expect(mapped.code).toBe('DATABASE_UNAVAILABLE');
      },
    );

    it('detecta errores de conexión por mensaje', () => {
      expect(isConnectionError(new Error('Connection terminated unexpectedly'))).toBe(true);
      expect(isConnectionError(new Error('timeout exceeded when trying to connect'))).toBe(true);
      expect(isConnectionError(new Error('otra cosa'))).toBe(false);
    });
  });

  it('devuelve null para errores desconocidos', () => {
    expect(mapDatabaseError(new Error('boom'))).toBeNull();
    expect(mapDatabaseError(pgError('42P01'))).toBeNull(); // tabla inexistente: es un bug, no un error del cliente
  });
});
