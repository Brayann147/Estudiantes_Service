const { api, documentPayload, createProgram, createStudent } = require('../helpers/factories');
const { resetDatabase, closeDatabase } = require('../helpers/db');

let student;

beforeEach(async () => {
  await resetDatabase();
  const program = await createProgram();
  student = await createStudent(program.id);
});
afterAll(closeDatabase);

const listUrl = (id = student.id) => `/api/estudiantes/${id}/documentos`;

describe('POST /api/estudiantes/:studentId/documentos', () => {
  it('crea un documento (201) con Location y valores por defecto', async () => {
    const res = await api().post(listUrl()).send({ type: 'CC', number: '1001234567' });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/documentos/${res.body.id}`);
    expect(res.body).toMatchObject({
      studentId: student.id,
      type: 'CC',
      number: '1001234567',
      isPrimary: false,
      issueDate: null,
      expirationDate: null,
    });
  });

  it('responde 409 DUPLICATE_DOCUMENT si (type, number) ya existe', async () => {
    const payload = documentPayload({ number: 'UPTC-00001' });
    await api().post(listUrl()).send(payload).expect(201);

    const res = await api().post(listUrl()).send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_DOCUMENT');
  });

  it('el mismo número con distinto tipo NO es duplicado', async () => {
    await api()
      .post(listUrl())
      .send(documentPayload({ type: 'CC', number: '12345678' }))
      .expect(201);
    await api()
      .post(listUrl())
      .send(documentPayload({ type: 'CE', number: '12345678' }))
      .expect(201);
  });

  it('responde 422 si la expiración es anterior a la expedición o el tipo es inválido', async () => {
    const dates = await api()
      .post(listUrl())
      .send(documentPayload({ issueDate: '2025-01-01', expirationDate: '2024-01-01' }));
    expect(dates.status).toBe(422);
    expect(dates.body.error.details[0].field).toBe('expirationDate');

    const type = await api()
      .post(listUrl())
      .send(documentPayload({ type: 'LICENCIA' }));
    expect(type.status).toBe(422);
  });

  it('responde 404 STUDENT_NOT_FOUND si el estudiante no existe', async () => {
    const res = await api().post(listUrl(99999)).send(documentPayload());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
  });

  it('solo puede haber un documento principal: el nuevo desmarca al anterior', async () => {
    const first = await api()
      .post(listUrl())
      .send(documentPayload({ isPrimary: true }));
    const second = await api()
      .post(listUrl())
      .send(documentPayload({ isPrimary: true }));
    expect(first.body.isPrimary).toBe(true);
    expect(second.body.isPrimary).toBe(true);

    const list = await api().get(listUrl());
    const primaries = list.body.data.filter((d) => d.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe(second.body.id);
    expect(list.body.data[0].id).toBe(second.body.id); // el principal aparece primero
  });
});

describe('GET documentos', () => {
  it('lista los documentos del estudiante y consulta uno por id', async () => {
    const a = await api().post(listUrl()).send(documentPayload());
    await api().post(listUrl()).send(documentPayload());

    const list = await api().get(listUrl());
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);

    const one = await api().get(`/api/documentos/${a.body.id}`);
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ id: a.body.id, studentId: student.id });
  });

  it('devuelve lista vacía si el estudiante no tiene documentos', async () => {
    const res = await api().get(listUrl());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('responde 404 para estudiante o documento inexistente y 400 para ids inválidos', async () => {
    const noStudent = await api().get(listUrl(99999));
    expect(noStudent.body.error.code).toBe('STUDENT_NOT_FOUND');

    const noDoc = await api().get('/api/documentos/99999');
    expect(noDoc.status).toBe(404);
    expect(noDoc.body.error.code).toBe('DOCUMENT_NOT_FOUND');

    await api().get('/api/documentos/abc').expect(400);
  });
});

describe('PUT / PATCH / DELETE /api/documentos/:id', () => {
  it('PUT reemplaza el documento (fechas omitidas quedan en null)', async () => {
    const created = await api().post(listUrl()).send(documentPayload());

    const res = await api()
      .put(`/api/documentos/${created.body.id}`)
      .send({ type: 'PASSPORT', number: 'AB1234567', isPrimary: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: 'PASSPORT',
      number: 'AB1234567',
      isPrimary: true,
      issueDate: null,
      expirationDate: null,
    });
    await api().put(`/api/documentos/${created.body.id}`).send({ type: 'CC' }).expect(422);
  });

  it('PATCH actualiza parcialmente y mueve la marca de principal', async () => {
    const a = await api()
      .post(listUrl())
      .send(documentPayload({ isPrimary: true }));
    const b = await api().post(listUrl()).send(documentPayload());

    const res = await api().patch(`/api/documentos/${b.body.id}`).send({ isPrimary: true });

    expect(res.status).toBe(200);
    expect(res.body.isPrimary).toBe(true);
    const oldPrimary = await api().get(`/api/documentos/${a.body.id}`);
    expect(oldPrimary.body.isPrimary).toBe(false);
  });

  it('PATCH valida las fechas contra los valores ya guardados', async () => {
    const created = await api()
      .post(listUrl())
      .send(documentPayload({ issueDate: '2024-02-01', expirationDate: '2028-01-31' }));

    const res = await api()
      .patch(`/api/documentos/${created.body.id}`)
      .send({ expirationDate: '2020-01-01' });

    expect(res.status).toBe(422);
    expect(res.body.error.details[0].field).toBe('expirationDate');
  });

  it('PATCH responde 409 si el nuevo (type, number) ya existe, y 404/422 según el caso', async () => {
    const a = await api()
      .post(listUrl())
      .send(documentPayload({ type: 'CC', number: '11111111' }));
    await api()
      .post(listUrl())
      .send(documentPayload({ type: 'CC', number: '22222222' }));

    const dup = await api().patch(`/api/documentos/${a.body.id}`).send({ number: '22222222' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_DOCUMENT');

    await api().patch('/api/documentos/99999').send({ isPrimary: true }).expect(404);
    await api().patch(`/api/documentos/${a.body.id}`).send({}).expect(422);
  });

  it('DELETE elimina el documento (204) y luego responde 404', async () => {
    const created = await api().post(listUrl()).send(documentPayload());

    await api().delete(`/api/documentos/${created.body.id}`).expect(204);
    await api().get(`/api/documentos/${created.body.id}`).expect(404);
    const again = await api().delete(`/api/documentos/${created.body.id}`);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('DOCUMENT_NOT_FOUND');
  });
});
