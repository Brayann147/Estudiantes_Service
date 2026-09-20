const SwaggerParser = require('@apidevtools/swagger-parser');
const spec = require('../../src/docs/openapi');
const { api } = require('../helpers/factories');

// Endpoints exigidos por el enunciado del laboratorio.
const REQUIRED = [
  'GET /health',
  'GET /api/estudiantes',
  'POST /api/estudiantes',
  'GET /api/estudiantes/{id}',
  'PUT /api/estudiantes/{id}',
  'PATCH /api/estudiantes/{id}',
  'DELETE /api/estudiantes/{id}',
  'GET /api/programas',
  'POST /api/programas',
  'GET /api/programas/{id}',
  'PUT /api/programas/{id}',
  'PATCH /api/programas/{id}',
  'DELETE /api/programas/{id}',
  'GET /api/estudiantes/{studentId}/contacto',
  'POST /api/estudiantes/{studentId}/contacto',
  'PUT /api/estudiantes/{studentId}/contacto',
  'PATCH /api/estudiantes/{studentId}/contacto',
  'DELETE /api/estudiantes/{studentId}/contacto',
  'GET /api/estudiantes/{studentId}/documentos',
  'POST /api/estudiantes/{studentId}/documentos',
  'GET /api/documentos/{id}',
  'PUT /api/documentos/{id}',
  'PATCH /api/documentos/{id}',
  'DELETE /api/documentos/{id}',
];

describe('Swagger / OpenAPI', () => {
  it('la especificación es un OpenAPI válido', async () => {
    await expect(SwaggerParser.validate(JSON.parse(JSON.stringify(spec)))).resolves.toBeDefined();
  });

  it('documenta todos los endpoints requeridos', () => {
    const documented = Object.entries(spec.paths).flatMap(([path, item]) =>
      ['get', 'post', 'put', 'patch', 'delete']
        .filter((m) => item[m])
        .map((m) => `${m.toUpperCase()} ${path}`),
    );
    expect(documented.sort()).toEqual([...REQUIRED].sort());
  });

  it('define los esquemas de Estudiante, Programa, Contacto y Documento', () => {
    for (const name of [
      'Student',
      'Program',
      'Contact',
      'Document',
      'ErrorResponse',
      'StudentGatewayContract',
    ]) {
      expect(spec.components.schemas[name]).toBeDefined();
    }
  });

  it('cada operación documenta respuestas exitosas y de error', () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if (!item[method]) continue;
        const codes = Object.keys(item[method].responses);
        expect(codes.some((c) => c.startsWith('2'))).toBe(true);
        if (path !== '/health') expect(codes).toContain('500');
      }
    }
  });

  it('GET /api-docs sirve Swagger UI y /api-docs.json la especificación', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');

    const json = await api().get('/api-docs.json');
    expect(json.status).toBe(200);
    expect(json.body.openapi).toBe('3.0.3');
  });
});
