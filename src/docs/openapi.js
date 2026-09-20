const { version } = require('../../package.json');
const { paths, parameters } = require('./paths');
const { schemas } = require('./schemas');

const description = `
API REST del **módulo Estudiantes** (Laboratorio 3 - Sistemas Distribuidos, UPTC).
Proceso independiente con su propia base de datos PostgreSQL (\`estudiantes_db\`), sin llaves foráneas
hacia Materias ni Inscripciones.

### Contrato con el API Gateway
\`GET /api/estudiantes/{id}\` devuelve como mínimo \`{ "id", "nombre", "programa" }\`
(ver esquema **StudentGatewayContract**). El Gateway lo combina con los datos de Materias e
Inscripciones para exponer \`GET /api/estudiantes/{id}/detalle\`.

### Formato de errores
Todas las respuestas de error usan \`{ "error": { "code", "message", "details": [] } }\`.

| HTTP | Cuándo |
|------|--------|
| 400 | Petición mal formada: JSON inválido, id no numérico, parámetros de consulta inválidos |
| 404 | El recurso solicitado no existe |
| 409 | Conflicto: documento/correo/código duplicado, programa con estudiantes, contacto ya existente |
| 422 | El cuerpo JSON no cumple las reglas de validación, o \`programId\` no existe |
| 500 | Error interno |
| 503 | PostgreSQL no disponible |
`.trim();

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Módulo Estudiantes API',
    version,
    description,
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Estudiantes', description: 'Entidad raíz del módulo' },
    { name: 'Programas', description: 'Un programa tiene muchos estudiantes (1:N)' },
    { name: 'Contactos', description: 'Contacto principal del estudiante (1:1)' },
    { name: 'Documentos', description: 'Documentos del estudiante (1:N)' },
    { name: 'Salud', description: 'Chequeo de disponibilidad' },
  ],
  paths,
  components: { schemas, parameters },
};
