const { escapeLike, WhereBuilder, buildUpdateSet } = require('../../src/utils/sql');

describe('utils/sql', () => {
  it('escapeLike escapa %, _ y \\', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escapeLike('Laura')).toBe('Laura');
  });

  it('WhereBuilder numera los parámetros y nunca inserta valores en el SQL', () => {
    const where = new WhereBuilder()
      .add('s.status = $?', "active'; DROP TABLE students;--")
      .add('s.program_id = $?', 2);

    expect(where.sql).toBe('WHERE s.status = $1 AND s.program_id = $2');
    expect(where.sql).not.toContain('DROP');
    expect(where.params).toEqual(["active'; DROP TABLE students;--", 2]);
  });

  it('WhereBuilder sin condiciones genera SQL vacío', () => {
    expect(new WhereBuilder().sql).toBe('');
  });

  it('buildUpdateSet usa solo columnas de la lista blanca e ignora undefined', () => {
    const { sets, params } = buildUpdateSet(
      { firstName: 'first_name', status: 'status' },
      { firstName: 'Ana', status: undefined, hack: '1; DROP TABLE x', id: 9 },
    );
    expect(sets).toEqual(['first_name = $1']);
    expect(params).toEqual(['Ana']);
  });

  it('buildUpdateSet conserva null como valor y respeta el índice inicial', () => {
    const { sets, params } = buildUpdateSet(
      { address: 'address', phone: 'phone' },
      { address: null, phone: '3101234567' },
      3,
    );
    expect(sets).toEqual(['address = $3', 'phone = $4']);
    expect(params).toEqual([null, '3101234567']);
  });
});
