const { STUDENT_SORT_FIELDS, PROGRAM_SORT_FIELDS } = require('../../src/constants/enums');
const studentRepository = require('../../src/repositories/student.repository');
const programRepository = require('../../src/repositories/program.repository');

describe('lista blanca de ordenamiento', () => {
  it('cada campo permitido por el validador tiene una columna SQL y viceversa', () => {
    expect(Object.keys(studentRepository.SORT_COLUMNS).sort()).toEqual(
      [...STUDENT_SORT_FIELDS].sort(),
    );
    expect(Object.keys(programRepository.SORT_COLUMNS).sort()).toEqual(
      [...PROGRAM_SORT_FIELDS].sort(),
    );
  });

  it('el repositorio rechaza un sortBy desconocido aunque el validador fallara (defensa en profundidad)', async () => {
    await expect(
      studentRepository.findAll({
        sortBy: 'id; DROP TABLE students',
        sortDirection: 'asc',
        limit: 1,
        offset: 0,
      }),
    ).rejects.toThrow(/no permitido/);
    await expect(
      programRepository.findAll({ sortBy: '1=1', sortDirection: 'asc', limit: 1, offset: 0 }),
    ).rejects.toThrow(/no permitido/);
  });
});
