const errorHandler = require('../../src/middlewares/errorHandler');
const { Errors } = require('../../src/errors');

function run(err) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, jest.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe('middlewares/errorHandler', () => {
  it('serializa un AppError con la estructura uniforme', () => {
    const { status, body } = run(Errors.studentNotFound());
    expect(status).toBe(404);
    expect(body).toEqual({
      error: {
        code: 'STUDENT_NOT_FOUND',
        message: 'El estudiante solicitado no existe',
        details: [],
      },
    });
  });

  it('traduce el error del parser JSON a 400 INVALID_JSON', () => {
    const { status, body } = run(Object.assign(new Error('x'), { type: 'entity.parse.failed' }));
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('traduce un error de PostgreSQL', () => {
    const { status, body } = run(
      Object.assign(new Error('dup'), { code: '23505', constraint: 'uq_contacts_email' }),
    );
    expect(status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('un error desconocido produce 500 sin exponer el mensaje interno', () => {
    const { status, body } = run(new Error('password=supersecreta'));
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('supersecreta');
  });
});
