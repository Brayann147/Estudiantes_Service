const { api, programPayload, createProgram, createStudent } = require('../helpers/factories');
const { resetDatabase, closeDatabase } = require('../helpers/db');

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('POST /api/programas', () => {
  it('crea un programa (201), normaliza el código a mayúsculas y usa status active', async () => {
    const res = await api()
      .post('/api/programas')
      .send(programPayload({ code: 'isis', name: 'Ingeniería de Sistemas' }));

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/programas/${res.body.id}`);
    expect(res.body).toMatchObject({ code: 'ISIS', status: 'active', modality: 'onsite' });
  });

  it('responde 409 DUPLICATE_PROGRAM_CODE con un código repetido', async () => {
    await createProgram({ code: 'ISIS' });
    const res = await api()
      .post('/api/programas')
      .send(programPayload({ code: 'ISIS' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_PROGRAM_CODE');
  });

  it('responde 422 con datos inválidos', async () => {
    const res = await api().post('/api/programas').send({ code: '!', modality: 'nube' });
    expect(res.status).toBe(422);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['code', 'name', 'faculty', 'modality']));
  });
});

describe('GET /api/programas', () => {
  it('lista con paginación, orden y filtros', async () => {
    await createProgram({ code: 'A1', name: 'Ingeniería Civil', modality: 'onsite' });
    await createProgram({ code: 'B2', name: 'Ingeniería de Sistemas', modality: 'online' });
    await createProgram({ code: 'C3', name: 'Derecho', modality: 'onsite', status: 'inactive' });

    const all = await api().get('/api/programas').query({ sortBy: 'name', sortDirection: 'asc' });
    expect(all.body.data.map((p) => p.name)).toEqual([
      'Derecho',
      'Ingeniería Civil',
      'Ingeniería de Sistemas',
    ]);
    expect(all.body.pagination).toEqual({
      pageNumber: 1,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    });

    const page = await api().get('/api/programas').query({ pageSize: 2, pageNumber: 2 });
    expect(page.body.data).toHaveLength(1);

    const byName = await api().get('/api/programas').query({ name: 'ingeniería' });
    expect(byName.body.pagination.totalItems).toBe(2);
    const byStatus = await api().get('/api/programas').query({ status: 'inactive' });
    expect(byStatus.body.data.map((p) => p.code)).toEqual(['C3']);
    const byModality = await api().get('/api/programas').query({ modality: 'online' });
    expect(byModality.body.data.map((p) => p.code)).toEqual(['B2']);
  });

  it('rechaza con 400 un sortBy no permitido', async () => {
    const res = await api().get('/api/programas').query({ sortBy: 'password' });
    expect(res.status).toBe(400);
  });
});

describe('GET/PUT/PATCH/DELETE /api/programas/:id', () => {
  it('consulta un programa y responde 404 si no existe', async () => {
    const created = await createProgram({ name: 'Derecho' });

    const ok = await api().get(`/api/programas/${created.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe('Derecho');

    const missing = await api().get('/api/programas/99999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('PROGRAM_NOT_FOUND');

    await api().get('/api/programas/abc').expect(400);
  });

  it('PUT reemplaza y PATCH actualiza parcialmente', async () => {
    const created = await createProgram();

    const put = await api().put(`/api/programas/${created.id}`).send({
      code: 'NEW1',
      name: 'Nuevo nombre',
      faculty: 'Nueva facultad',
      modality: 'hybrid',
      status: 'inactive',
    });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ code: 'NEW1', modality: 'hybrid', status: 'inactive' });

    const patch = await api().patch(`/api/programas/${created.id}`).send({ status: 'active' });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ status: 'active', name: 'Nuevo nombre' });

    await api().put(`/api/programas/${created.id}`).send({ name: 'x' }).expect(422);
    await api().patch(`/api/programas/${created.id}`).send({}).expect(422);
    await api().patch('/api/programas/99999').send({ status: 'active' }).expect(404);
  });

  it('responde 409 si el nuevo código ya lo usa otro programa', async () => {
    const a = await createProgram({ code: 'AAA' });
    await createProgram({ code: 'BBB' });
    const res = await api().patch(`/api/programas/${a.id}`).send({ code: 'BBB' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_PROGRAM_CODE');
  });

  it('DELETE elimina un programa sin estudiantes (204)', async () => {
    const created = await createProgram();
    await api().delete(`/api/programas/${created.id}`).expect(204);
    await api().get(`/api/programas/${created.id}`).expect(404);
    await api().delete(`/api/programas/${created.id}`).expect(404);
  });

  it('DELETE responde 409 PROGRAM_HAS_STUDENTS si tiene estudiantes', async () => {
    const program = await createProgram();
    await createStudent(program.id);

    const res = await api().delete(`/api/programas/${program.id}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROGRAM_HAS_STUDENTS');
    await api().get(`/api/programas/${program.id}`).expect(200);
  });
});
