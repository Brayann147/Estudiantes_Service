const { api, contactPayload, createProgram, createStudent } = require('../helpers/factories');
const { resetDatabase, closeDatabase } = require('../helpers/db');

let student;

beforeEach(async () => {
  await resetDatabase();
  const program = await createProgram();
  student = await createStudent(program.id);
});
afterAll(closeDatabase);

const url = (id = student.id) => `/api/estudiantes/${id}/contacto`;

describe('POST /api/estudiantes/:studentId/contacto', () => {
  it('crea el contacto principal (201) y normaliza el correo a minúsculas', async () => {
    const res = await api()
      .post(url())
      .send(contactPayload({ email: 'Laura.Gomez@Example.COM' }));

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(url());
    expect(res.body).toMatchObject({
      studentId: student.id,
      email: 'laura.gomez@example.com',
      phone: '3101234567',
    });
  });

  it('acepta solo los campos obligatorios y deja el resto en null', async () => {
    const res = await api().post(url()).send({ email: 'a@example.com', phone: '3101234567' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      address: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    });
  });

  it('responde 409 CONTACT_ALREADY_EXISTS si el estudiante ya tiene contacto (1:1)', async () => {
    await api().post(url()).send(contactPayload()).expect(201);
    const res = await api().post(url()).send(contactPayload());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONTACT_ALREADY_EXISTS');
  });

  it('responde 409 DUPLICATE_EMAIL si otro estudiante ya usa el correo', async () => {
    const other = await createStudent((await api().get('/api/programas')).body.data[0].id);
    await api()
      .post(url(other.id))
      .send(contactPayload({ email: 'dup@example.com' }))
      .expect(201);

    const res = await api()
      .post(url())
      .send(contactPayload({ email: 'DUP@example.com' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('responde 422 con correo o teléfono inválidos y campos desconocidos', async () => {
    const res = await api().post(url()).send({ email: 'no-es-correo', phone: 'abc', studentId: 5 });
    expect(res.status).toBe(422);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'phone', 'studentId']));
  });

  it('responde 404 STUDENT_NOT_FOUND y 400 INVALID_ID', async () => {
    const missing = await api().post(url(99999)).send(contactPayload());
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('STUDENT_NOT_FOUND');

    await api().post(url('abc')).send(contactPayload()).expect(400);
  });
});

describe('GET /api/estudiantes/:studentId/contacto', () => {
  it('consulta el contacto creado', async () => {
    await api()
      .post(url())
      .send(contactPayload({ phone: '3001112233' }))
      .expect(201);

    const res = await api().get(url());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ studentId: student.id, phone: '3001112233' });
  });

  it('responde 404 CONTACT_NOT_FOUND si aún no tiene contacto', async () => {
    const res = await api().get(url());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONTACT_NOT_FOUND');
  });

  it('responde 404 STUDENT_NOT_FOUND si el estudiante no existe', async () => {
    const res = await api().get(url(99999));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
  });
});

describe('PUT / PATCH / DELETE contacto', () => {
  it('PUT reemplaza el contacto y deja en null los opcionales omitidos', async () => {
    await api().post(url()).send(contactPayload()).expect(201);

    const res = await api().put(url()).send({ email: 'nuevo@example.com', phone: '3115556677' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'nuevo@example.com',
      phone: '3115556677',
      address: null,
      emergencyContactName: null,
    });
  });

  it('PUT y PATCH responden 404 CONTACT_NOT_FOUND si no hay contacto', async () => {
    const put = await api().put(url()).send({ email: 'a@example.com', phone: '3101234567' });
    expect(put.status).toBe(404);
    expect(put.body.error.code).toBe('CONTACT_NOT_FOUND');

    const patch = await api().patch(url()).send({ phone: '3101234567' });
    expect(patch.status).toBe(404);
  });

  it('PATCH modifica solo lo enviado y permite poner un opcional en null', async () => {
    await api()
      .post(url())
      .send(contactPayload({ address: 'Calle 1' }))
      .expect(201);

    const res = await api().patch(url()).send({ phone: '3199998888', address: null });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('3199998888');
    expect(res.body.address).toBeNull();
    expect(res.body.emergencyContactName).toBe('Marta Gómez'); // sin cambios

    await api().patch(url()).send({}).expect(422);
  });

  it('PUT responde 409 si el correo ya pertenece a otro estudiante', async () => {
    const other = await createStudent((await api().get('/api/programas')).body.data[0].id);
    await api()
      .post(url(other.id))
      .send(contactPayload({ email: 'ocupado@example.com' }));
    await api().post(url()).send(contactPayload()).expect(201);

    const res = await api().put(url()).send({ email: 'ocupado@example.com', phone: '3101234567' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('DELETE elimina el contacto (204) y luego responde 404', async () => {
    await api().post(url()).send(contactPayload()).expect(201);

    await api().delete(url()).expect(204);
    await api().get(url()).expect(404);
    await api().delete(url()).expect(404);
  });
});
