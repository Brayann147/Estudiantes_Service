jest.mock('../../src/storage/photoStorage');

const photoStorage = require('../../src/storage/photoStorage');
const { api, createProgram, createStudent } = require('../helpers/factories');
const { pool, resetDatabase, closeDatabase } = require('../helpers/db');

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(100),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

let student;

beforeEach(async () => {
  await resetDatabase();
  jest.resetAllMocks();
  photoStorage.putPhoto.mockResolvedValue();
  photoStorage.deletePhoto.mockResolvedValue();
  photoStorage.signedPhotoUrl.mockImplementation(
    async (key) => `https://s3.test/${key}?X-Amz-Signature=x`,
  );
  const program = await createProgram();
  student = await createStudent(program.id);
});
afterAll(closeDatabase);

const upload = (id, buffer, filename = 'foto.png') =>
  api().put(`/api/estudiantes/${id}/foto`).attach('file', buffer, filename);

describe('PUT /api/estudiantes/:id/foto', () => {
  it('sube un PNG al bucket y la base guarda SOLO metadatos', async () => {
    const res = await upload(student.id, PNG, 'laura.png');

    expect(res.status).toBe(200);
    expect(res.body.foto).toMatchObject({
      originalName: 'laura.png',
      contentType: 'image/png',
      sizeBytes: PNG.length,
    });
    expect(res.body.fotoUrl).toMatch(
      /^https:\/\/s3\.test\/estudiantes\/\d+\/.+\.png\?X-Amz-Signature/,
    );

    const [key, body, contentType] = photoStorage.putPhoto.mock.calls[0];
    expect(key).toMatch(new RegExp(`^estudiantes/${student.id}/[0-9a-f-]+\\.png$`));
    expect(body.equals(PNG)).toBe(true);
    expect(contentType).toBe('image/png');

    const { rows } = await pool.query(
      `SELECT photo_key, photo_original_name, photo_content_type, photo_size_bytes
         FROM students WHERE id = $1`,
      [student.id],
    );
    expect(rows[0]).toEqual({
      photo_key: key,
      photo_original_name: 'laura.png',
      photo_content_type: 'image/png',
      photo_size_bytes: PNG.length,
    });
  });

  it('reemplaza la foto y borra el objeto anterior', async () => {
    await upload(student.id, PNG);
    const firstKey = photoStorage.putPhoto.mock.calls[0][0];

    const res = await upload(student.id, JPG, 'nueva.jpg');

    expect(res.status).toBe(200);
    expect(res.body.foto.contentType).toBe('image/jpeg');
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith(firstKey);
  });

  it('rechaza con 415 un archivo que no es imagen aunque se llame .png', async () => {
    const res = await upload(student.id, Buffer.from('%PDF-1.7 contenido'), 'foto.png');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_PHOTO_TYPE');
    expect(photoStorage.putPhoto).not.toHaveBeenCalled();
  });

  it('rechaza con 413 una imagen de más de 2 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await upload(student.id, big);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PHOTO_TOO_LARGE');
    expect(photoStorage.putPhoto).not.toHaveBeenCalled();
  });

  it('responde 422 si no se envía el archivo', async () => {
    const res = await api().put(`/api/estudiantes/${student.id}/foto`).field('otro', 'x');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PHOTO_REQUIRED');
  });

  it('responde 404 si el estudiante no existe', async () => {
    const res = await upload(999999, PNG);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
    expect(photoStorage.putPhoto).not.toHaveBeenCalled();
  });
});

describe('fotoUrl en las lecturas (llega a /detalle a través del Gateway)', () => {
  it('GET /:id incluye fotoUrl firmada cuando hay foto y null cuando no', async () => {
    const before = await api().get(`/api/estudiantes/${student.id}`);
    expect(before.body.fotoUrl).toBeNull();
    expect(before.body.foto).toBeNull();

    await upload(student.id, PNG);
    const after = await api().get(`/api/estudiantes/${student.id}`);

    expect(after.body.fotoUrl).toMatch(/X-Amz-Signature/);
    expect(after.body).toMatchObject({ id: student.id, nombre: expect.any(String) });
  });

  it('el listado incluye fotoUrl por estudiante', async () => {
    await upload(student.id, PNG);
    const res = await api().get('/api/estudiantes');

    expect(res.body.data[0].fotoUrl).toMatch(/X-Amz-Signature/);
  });
});

describe('GET y DELETE /api/estudiantes/:id/foto', () => {
  it('GET devuelve una URL temporal con su vencimiento', async () => {
    photoStorage.urlTtlSeconds = 600;
    await upload(student.id, PNG);
    const res = await api().get(`/api/estudiantes/${student.id}/foto`);

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/X-Amz-Signature/);
  });

  it('GET responde 404 PHOTO_NOT_FOUND si no tiene foto', async () => {
    const res = await api().get(`/api/estudiantes/${student.id}/foto`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PHOTO_NOT_FOUND');
  });

  it('DELETE borra el objeto y los metadatos', async () => {
    await upload(student.id, PNG);
    const key = photoStorage.putPhoto.mock.calls[0][0];

    const res = await api().delete(`/api/estudiantes/${student.id}/foto`);

    expect(res.status).toBe(204);
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith(key);
    const after = await api().get(`/api/estudiantes/${student.id}`);
    expect(after.body.foto).toBeNull();
  });

  it('eliminar al estudiante borra también su foto del bucket', async () => {
    await upload(student.id, PNG);
    const key = photoStorage.putPhoto.mock.calls[0][0];

    await api().delete(`/api/estudiantes/${student.id}`).expect(204);

    expect(photoStorage.deletePhoto).toHaveBeenCalledWith(key);
  });
});
