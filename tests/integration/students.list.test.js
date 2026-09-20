const { api, contactPayload, createProgram, createStudent } = require('../helpers/factories');
const { pool, resetDatabase, closeDatabase } = require('../helpers/db');

let industrial;

// 25 estudiantes: apellidos "Apellido01".."Apellido25" creados en orden INVERSO para que
// ordenar por apellido sea distinto de ordenar por id.
beforeAll(async () => {
  await resetDatabase();
  const sistemas = await createProgram({ name: 'Ingeniería de Sistemas' });
  industrial = await createProgram({ name: 'Ingeniería Industrial' });

  for (let n = 25; n >= 1; n--) {
    const pad = String(n).padStart(2, '0');
    await createStudent(n <= 10 ? industrial.id : sistemas.id, {
      firstName: n === 7 ? 'Laura' : `Nombre${pad}`,
      lastName: `Apellido${pad}`,
      documentNumber: `1000000${pad}`,
      birthDate: `2000-01-${pad}`,
      status: n % 5 === 0 ? 'inactive' : 'active',
    });
  }
  const laura = await api().get('/api/estudiantes').query({ name: 'Laura' });
  await api()
    .post(`/api/estudiantes/${laura.body.data[0].id}/contacto`)
    .send(contactPayload({ email: 'laura.buscada@example.com' }))
    .expect(201);
});
afterAll(closeDatabase);

const list = (query) => api().get('/api/estudiantes').query(query);

describe('Paginación', () => {
  it('usa pageNumber=1 y pageSize=10 por defecto y calcula totales', async () => {
    const res = await list({});

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination).toEqual({
      pageNumber: 1,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it('devuelve la última página con los elementos restantes', async () => {
    const res = await list({ pageNumber: 3, pageSize: 10 });
    expect(res.body.data).toHaveLength(5);
    expect(res.body.pagination.pageNumber).toBe(3);
  });

  it('respeta pageSize y no repite elementos entre páginas', async () => {
    const p1 = await list({ pageNumber: 1, pageSize: 5 });
    const p2 = await list({ pageNumber: 2, pageSize: 5 });
    expect(p1.body.pagination.totalPages).toBe(5);
    const ids1 = p1.body.data.map((s) => s.id);
    const ids2 = p2.body.data.map((s) => s.id);
    expect(ids1.filter((id) => ids2.includes(id))).toEqual([]);
  });

  it('una página fuera de rango devuelve lista vacía con 200', async () => {
    const res = await list({ pageNumber: 99 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(25);
  });

  it.each([
    [{ pageNumber: 0 }],
    [{ pageNumber: -1 }],
    [{ pageSize: 0 }],
    [{ pageSize: 101 }],
    [{ pageSize: 'abc' }],
    [{ pageNumber: 1.5 }],
  ])('rechaza con 400 la paginación inválida %j', async (query) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUERY_PARAMS');
  });
});

describe('Ordenamiento', () => {
  it('ordena por apellido ascendente', async () => {
    const res = await list({ sortBy: 'lastName', sortDirection: 'asc', pageSize: 100 });
    const names = res.body.data.map((s) => s.lastName);
    expect(names).toEqual([...names].sort());
    expect(names[0]).toBe('Apellido01');
    expect(names[24]).toBe('Apellido25');
  });

  it('ordena por apellido descendente (acepta DESC en mayúsculas)', async () => {
    const res = await list({ sortBy: 'lastName', sortDirection: 'DESC', pageSize: 100 });
    expect(res.body.data[0].lastName).toBe('Apellido25');
    expect(res.body.data[24].lastName).toBe('Apellido01');
  });

  it('ordena por otros campos permitidos (birthDate, id)', async () => {
    const byBirth = await list({ sortBy: 'birthDate', sortDirection: 'desc', pageSize: 3 });
    expect(byBirth.body.data.map((s) => s.birthDate)).toEqual([
      '2000-01-25',
      '2000-01-24',
      '2000-01-23',
    ]);

    const byId = await list({ sortBy: 'id', sortDirection: 'desc', pageSize: 100 });
    const ids = byId.body.data.map((s) => s.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it('la paginación mantiene el orden entre páginas', async () => {
    const p1 = await list({ sortBy: 'lastName', pageSize: 10, pageNumber: 1 });
    const p2 = await list({ sortBy: 'lastName', pageSize: 10, pageNumber: 2 });
    expect(p1.body.data[9].lastName).toBe('Apellido10');
    expect(p2.body.data[0].lastName).toBe('Apellido11');
  });

  it.each(['password', 'nombre', 'id; DROP TABLE students;--', 'id, (SELECT pg_sleep(5))', 's.id'])(
    'rechaza con 400 un sortBy fuera de la lista blanca: "%s"',
    async (sortBy) => {
      const res = await api().get('/api/estudiantes').query({ sortBy });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY_PARAMS');
      const still = await pool.query('SELECT COUNT(*)::int AS n FROM students');
      expect(still.rows[0].n).toBe(25);
    },
  );

  it('rechaza con 400 una sortDirection inválida', async () => {
    const res = await list({ sortDirection: 'sideways' });
    expect(res.status).toBe(400);
  });
});

describe('Filtros', () => {
  it('name: coincidencia parcial sin distinguir mayúsculas', async () => {
    const res = await list({ name: 'laura' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nombre).toBe('Laura Apellido07');
  });

  it('name: busca también por apellido y trata % y _ como texto literal', async () => {
    const byLast = await list({ name: 'Apellido2' });
    expect(byLast.body.pagination.totalItems).toBe(6); // 20..25

    const wildcard = await list({ name: '%' });
    expect(wildcard.body.data).toEqual([]);
    const underscore = await list({ name: 'Apellido_1' });
    expect(underscore.body.data).toEqual([]);
  });

  it('programId: solo estudiantes de ese programa', async () => {
    const res = await list({ programId: industrial.id, pageSize: 100 });
    expect(res.body.pagination.totalItems).toBe(10);
    expect(res.body.data.every((s) => s.programId === industrial.id)).toBe(true);
    expect(res.body.data.every((s) => s.programa === 'Ingeniería Industrial')).toBe(true);
  });

  it('status: solo estudiantes con ese estado', async () => {
    const res = await list({ status: 'inactive', pageSize: 100 });
    expect(res.body.pagination.totalItems).toBe(5);
    expect(res.body.data.every((s) => s.status === 'inactive')).toBe(true);
  });

  it('documentNumber: coincidencia exacta', async () => {
    const res = await list({ documentNumber: '100000012' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].documentNumber).toBe('100000012');
  });

  it('email: busca por el correo del contacto (sin distinguir mayúsculas)', async () => {
    const res = await list({ email: 'LAURA.BUSCADA@example.com' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('laura.buscada@example.com');
  });

  it('combina filtros con AND y devuelve lista vacía si nada coincide', async () => {
    const combined = await list({ programId: industrial.id, status: 'inactive' });
    expect(combined.body.pagination.totalItems).toBe(2); // 5 y 10

    const none = await list({ documentNumber: '000000' });
    expect(none.status).toBe(200);
    expect(none.body).toEqual({
      data: [],
      pagination: { pageNumber: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
    });
  });

  it('ignora filtros vacíos y rechaza valores inválidos con 400', async () => {
    const empty = await list({ name: '', status: '' });
    expect(empty.body.pagination.totalItems).toBe(25);

    for (const bad of [{ status: 'volando' }, { programId: 'abc' }, { email: 'no-es-correo' }]) {
      const res = await list(bad);
      expect(res.status).toBe(400);
    }
  });

  it('funciona junto con paginación y ordenamiento', async () => {
    const res = await list({
      status: 'active',
      sortBy: 'lastName',
      sortDirection: 'desc',
      pageNumber: 1,
      pageSize: 5,
    });
    expect(res.body.pagination.totalItems).toBe(20);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0].lastName).toBe('Apellido24');
  });
});

describe('Consistencia del listado', () => {
  it('cada elemento cumple el contrato { id, nombre, programa }', async () => {
    const res = await list({ pageSize: 100 });
    for (const s of res.body.data) {
      expect(typeof s.id).toBe('number');
      expect(s.nombre).toBe(`${s.firstName} ${s.lastName}`);
      expect(typeof s.programa).toBe('string');
    }
  });
});
