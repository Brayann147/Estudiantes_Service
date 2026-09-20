const {
  api,
  studentPayload,
  contactPayload,
  documentPayload,
  createProgram,
  createStudent,
} = require('../helpers/factories');
const { pool, resetDatabase, closeDatabase } = require('../helpers/db');

let program;

beforeEach(async () => {
  await resetDatabase();
  program = await createProgram({ name: 'Ingeniería de Sistemas' });
});
afterAll(closeDatabase);

describe('POST /api/estudiantes', () => {
  it('crea un estudiante y devuelve 201 con Location y el contrato del Gateway', async () => {
    const payload = studentPayload(program.id, { firstName: 'Laura', lastName: 'Gómez' });

    const res = await api().post('/api/estudiantes').send(payload);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/estudiantes/${res.body.id}`);
    expect(res.body).toMatchObject({
      nombre: 'Laura Gómez',
      programa: 'Ingeniería de Sistemas',
      firstName: 'Laura',
      lastName: 'Gómez',
      documentNumber: payload.documentNumber,
      status: 'active', // valor por defecto
      programId: program.id,
      email: null,
    });
    expect(res.body.createdAt).toBeDefined();
  });

  it('rechaza con 422 un cuerpo inválido y detalla los campos', async () => {
    const res = await api()
      .post('/api/estudiantes')
      .send({ firstName: '', documentType: 'XX', birthDate: '2999-01-01', extra: true });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'lastName',
        'documentType',
        'documentNumber',
        'birthDate',
        'gender',
        'programId',
        'extra',
      ]),
    );
  });

  it('rechaza con 422 una fecha de nacimiento inexistente en el calendario', async () => {
    const res = await api()
      .post('/api/estudiantes')
      .send(studentPayload(program.id, { birthDate: '2002-02-31' }));
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].field).toBe('birthDate');
  });

  it('responde 422 PROGRAM_NOT_FOUND cuando el programa no existe', async () => {
    const res = await api().post('/api/estudiantes').send(studentPayload(99999));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PROGRAM_NOT_FOUND');
    expect(res.body.error.details[0].field).toBe('programId');
  });

  it('responde 409 DUPLICATE_DOCUMENT_NUMBER si el documento ya existe', async () => {
    const payload = studentPayload(program.id);
    await api().post('/api/estudiantes').send(payload).expect(201);

    const res = await api().post('/api/estudiantes').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_DOCUMENT_NUMBER');
  });

  it('responde 400 INVALID_JSON cuando el cuerpo no es JSON válido', async () => {
    const res = await api()
      .post('/api/estudiantes')
      .set('Content-Type', 'application/json')
      .send('{"firstName": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('usa el formato uniforme de error { error: { code, message, details } }', async () => {
    const res = await api().post('/api/estudiantes').send({});
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'details', 'message']);
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});

describe('GET /api/estudiantes/:id', () => {
  it('devuelve el estudiante con el contrato mínimo { id, nombre, programa }', async () => {
    const created = await createStudent(program.id, { firstName: 'Laura', lastName: 'Gómez' });

    const res = await api().get(`/api/estudiantes/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      nombre: 'Laura Gómez',
      programa: 'Ingeniería de Sistemas',
    });
  });

  it('incluye el correo del contacto principal cuando existe', async () => {
    const created = await createStudent(program.id);
    await api()
      .post(`/api/estudiantes/${created.id}/contacto`)
      .send(contactPayload({ email: 'laura@example.com' }))
      .expect(201);

    const res = await api().get(`/api/estudiantes/${created.id}`);

    expect(res.body.email).toBe('laura@example.com');
  });

  it('responde 404 STUDENT_NOT_FOUND si no existe', async () => {
    const res = await api().get('/api/estudiantes/99999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
    expect(res.body.error.message).toBe('El estudiante solicitado no existe');
  });

  it.each(['abc', '0', '-5', '1.5', '99999999999'])(
    'responde 400 INVALID_ID para el id "%s"',
    async (id) => {
      const res = await api().get(`/api/estudiantes/${id}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    },
  );
});

describe('PUT /api/estudiantes/:id', () => {
  it('reemplaza todos los campos', async () => {
    const created = await createStudent(program.id);
    const other = await createProgram({ name: 'Ingeniería Industrial' });
    const payload = studentPayload(other.id, {
      firstName: 'Ana',
      lastName: 'Ruiz',
      status: 'suspended',
    });

    const res = await api().put(`/api/estudiantes/${created.id}`).send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      nombre: 'Ana Ruiz',
      programa: 'Ingeniería Industrial',
      status: 'suspended',
    });
  });

  it('exige todos los campos (422) y valida que el estudiante exista (404)', async () => {
    const created = await createStudent(program.id);

    const incomplete = await api().put(`/api/estudiantes/${created.id}`).send({ firstName: 'Ana' });
    expect(incomplete.status).toBe(422);

    const missing = await api()
      .put('/api/estudiantes/99999')
      .send({ ...studentPayload(program.id), status: 'active' });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('STUDENT_NOT_FOUND');
  });

  it('responde 422 PROGRAM_NOT_FOUND y 409 por documento duplicado', async () => {
    const a = await createStudent(program.id);
    const b = await createStudent(program.id);

    const noProgram = await api()
      .put(`/api/estudiantes/${a.id}`)
      .send({ ...studentPayload(99999), status: 'active' });
    expect(noProgram.status).toBe(422);
    expect(noProgram.body.error.code).toBe('PROGRAM_NOT_FOUND');

    const duplicate = await api()
      .put(`/api/estudiantes/${a.id}`)
      .send({
        ...studentPayload(program.id, { documentNumber: b.documentNumber }),
        status: 'active',
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_DOCUMENT_NUMBER');
  });
});

describe('PATCH /api/estudiantes/:id', () => {
  it('actualiza solo los campos enviados y refresca updatedAt', async () => {
    const created = await createStudent(program.id, { firstName: 'Laura', lastName: 'Gómez' });

    const res = await api().patch(`/api/estudiantes/${created.id}`).send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');
    expect(res.body.nombre).toBe('Laura Gómez'); // sin cambios
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it('responde 422 con cuerpo vacío o campos no permitidos', async () => {
    const created = await createStudent(program.id);

    const empty = await api().patch(`/api/estudiantes/${created.id}`).send({});
    expect(empty.status).toBe(422);

    const unknown = await api().patch(`/api/estudiantes/${created.id}`).send({ id: 5 });
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.details[0].field).toBe('id');
  });

  it('responde 404 si el estudiante no existe y 422 si el programa no existe', async () => {
    const created = await createStudent(program.id);

    const missing = await api().patch('/api/estudiantes/99999').send({ status: 'inactive' });
    expect(missing.status).toBe(404);

    const noProgram = await api()
      .patch(`/api/estudiantes/${created.id}`)
      .send({ programId: 99999 });
    expect(noProgram.status).toBe(422);
    expect(noProgram.body.error.code).toBe('PROGRAM_NOT_FOUND');
  });
});

describe('DELETE /api/estudiantes/:id', () => {
  it('elimina el estudiante (204) y luego responde 404', async () => {
    const created = await createStudent(program.id);

    const res = await api().delete(`/api/estudiantes/${created.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    await api().get(`/api/estudiantes/${created.id}`).expect(404);
  });

  it('elimina en cascada su contacto y sus documentos', async () => {
    const created = await createStudent(program.id);
    await api().post(`/api/estudiantes/${created.id}/contacto`).send(contactPayload()).expect(201);
    await api()
      .post(`/api/estudiantes/${created.id}/documentos`)
      .send(documentPayload())
      .expect(201);

    await api().delete(`/api/estudiantes/${created.id}`).expect(204);

    const contacts = await pool.query('SELECT COUNT(*)::int AS n FROM contacts');
    const documents = await pool.query('SELECT COUNT(*)::int AS n FROM documents');
    expect(contacts.rows[0].n).toBe(0);
    expect(documents.rows[0].n).toBe(0);
  });

  it('responde 404 STUDENT_NOT_FOUND si no existe', async () => {
    const res = await api().delete('/api/estudiantes/99999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
  });
});
