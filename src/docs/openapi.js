const { version } = require('../../package.json');
const { paths, parameters } = require('./paths');
const { schemas } = require('./schemas');

const description = `
API REST del **módulo Estudiantes** (Laboratorios 3 y 4 - Sistemas Distribuidos, UPTC).
Proceso independiente con su propia base de datos PostgreSQL (\`estudiantes_db\`), sin llaves foráneas
hacia Materias ni Inscripciones.

### Contrato con el API Gateway
\`GET /api/estudiantes/{id}\` devuelve como mínimo \`{ "id", "nombre", "programa" }\`
(ver esquema **StudentGatewayContract**). El Gateway lo combina con los datos de Materias e
Inscripciones para exponer \`GET /api/estudiantes/{id}/detalle\`; como la respuesta incluye \`fotoUrl\`,
la fotografía llega al detalle sin lógica adicional en el Gateway.

### Fotografía (Lab 4)
\`PUT /api/estudiantes/{id}/foto\` (multipart, campo \`file\`, JPG/PNG, máx. 2 MB). El archivo vive en un
bucket **privado** de almacenamiento de objetos; la base guarda solo metadatos (clave, nombre, tipo, tamaño).
\`fotoUrl\` es una URL **firmada y temporal**: sin firma, el objeto no es accesible.

### Formato de errores
Todas las respuestas de error usan \`{ "error": { "code", "message", "details": [] } }\`.

| HTTP | Cuándo |
|------|--------|
| 400 | Petición mal formada: JSON inválido, id no numérico, parámetros de consulta inválidos |
| 404 | El recurso solicitado no existe |
| 409 | Conflicto: documento/correo/código duplicado, programa con estudiantes, contacto ya existente |
| 413 | La fotografía supera 2 MB |
| 415 | La fotografía no es JPG ni PNG |
| 422 | El cuerpo JSON no cumple las reglas de validación, \`programId\` no existe, o falta el archivo |
| 500 | Error interno |
| 503 | PostgreSQL o el almacenamiento de archivos no disponible |
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
