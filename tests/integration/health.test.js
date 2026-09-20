const { api } = require('../helpers/factories');
const { pool, closeDatabase } = require('../helpers/db');

afterEach(() => jest.restoreAllMocks());
afterAll(closeDatabase);

const connectionRefused = () =>
  Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

describe('GET /health', () => {
  it('responde 200 y reporta la base de datos como disponible', async () => {
    const res = await api().get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'estudiantes-service',
      database: { status: 'up' },
    });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('responde 503 cuando PostgreSQL no está disponible', async () => {
    jest.spyOn(pool, 'query').mockRejectedValueOnce(connectionRefused());

    const res = await api().get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', database: { status: 'down' } });
  });
});

describe('Error de conexión con PostgreSQL en la API', () => {
  it('devuelve 503 DATABASE_UNAVAILABLE con el formato uniforme de error', async () => {
    jest.spyOn(pool, 'query').mockRejectedValue(connectionRefused());

    const res = await api().get('/api/estudiantes/1');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'No fue posible conectar con la base de datos',
        details: [],
      },
    });
  });

  it('devuelve 500 INTERNAL_ERROR sin filtrar detalles ante un error inesperado', async () => {
    jest.spyOn(pool, 'query').mockRejectedValue(new Error('boom: detalle interno secreto'));

    const res = await api().get('/api/estudiantes/1');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });
});

describe('Rutas inexistentes', () => {
  it('responde 404 ROUTE_NOT_FOUND', async () => {
    const res = await api().get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
