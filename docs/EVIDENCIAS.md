# Lista de evidencias para la entrega del laboratorio

Toma cada captura con la **URL/comando visible** y, si puedes, la fecha/hora del sistema. Sugerencia: crea una carpeta `evidencias/` y nombra los archivos con el número de esta lista.

Preparación (una sola vez):

```bash
docker compose up -d && npm install && npm run migrate && npm run seed && npm run dev
```

| #   | Evidencia                          | Qué capturar                                                                                                                   | Cómo obtenerla                                                                                                                                                                                                               |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Swagger funcionando**            | Página `/api-docs` con las secciones Estudiantes, Programas, Contactos, Documentos y Salud desplegadas, y la sección _Schemas_ | Navegador: <http://localhost:3001/api-docs>                                                                                                                                                                                  |
| 2   | **CRUD de estudiantes**            | En Swagger (_Try it out_) o cURL: POST 201 → GET 200 → PUT 200 → PATCH 200 → DELETE 204 → GET 404                              | Ver comandos en README §16                                                                                                                                                                                                   |
| 3   | **CRUD de programas**              | POST 201, GET, PUT, PATCH, DELETE 204; y `DELETE` de un programa con estudiantes → 409 `PROGRAM_HAS_STUDENTS`                  | Swagger o cURL                                                                                                                                                                                                               |
| 4   | **CRUD de contactos**              | POST 201, GET 200, PUT, PATCH, DELETE 204; segundo POST → 409 `CONTACT_ALREADY_EXISTS`                                         | `/api/estudiantes/{id}/contacto`                                                                                                                                                                                             |
| 5   | **CRUD de documentos**             | POST 201 (con `isPrimary`), GET lista, GET por id, PUT, PATCH, DELETE 204                                                      | `/api/estudiantes/{id}/documentos` y `/api/documentos/{id}`                                                                                                                                                                  |
| 6   | **Paginación**                     | `pageNumber=1&pageSize=10` y `pageNumber=3&pageSize=10` mostrando el bloque `pagination` (25 items, 3 páginas)                 | `curl "http://localhost:3001/api/estudiantes?pageNumber=1&pageSize=10"`                                                                                                                                                      |
| 7   | **Ordenamiento**                   | `sortBy=lastName&sortDirection=asc` y `desc`; además `sortBy=password` → 400 `INVALID_QUERY_PARAMS` (lista blanca)             | `curl "…/api/estudiantes?sortBy=lastName&sortDirection=desc"`                                                                                                                                                                |
| 8   | **Tres (o más) filtros**           | `name=Laura`, `programId=2`, `status=active`, `documentNumber=1001000012`, `email=laura.gomez@example.com`                     | Un cURL por filtro                                                                                                                                                                                                           |
| 9   | **Base de datos independiente**    | Lista de bases con `estudiantes_db` y sus 4 tablas; **sin** tablas de materias/inscripciones; FKs solo internas                | `docker exec -it estudiantes-db psql -U <DB_USER> -l` y luego `docker exec -it estudiantes-db psql -U <DB_USER> -d estudiantes_db -c "\dt"`                                                                                  |
| 9b  | **Sin FK entre módulos**           | Todas las FK apuntan a tablas del propio módulo                                                                                | `docker exec -it estudiantes-db psql -U <DB_USER> -d estudiantes_db -c "SELECT conrelid::regclass AS tabla, conname, confrelid::regclass AS referencia FROM pg_constraint WHERE contype='f';"` (resultado esperado: 3 filas) |
| 10  | **Contenedores Docker activos**    | `estudiantes-db` con estado `healthy` y el puerto `5433->5432`                                                                 | `docker compose ps` (y/o Docker Desktop)                                                                                                                                                                                     |
| 11  | **Endpoint /health**               | Respuesta 200 con `database.status = "up"`. Opcional: `docker compose stop db` → 503 `down`                                    | `curl -i http://localhost:3001/health`                                                                                                                                                                                       |
| 12  | **GET /api/estudiantes/:id**       | JSON con `id`, `nombre`, `programa` (ej. estudiante 12 = Laura Gómez)                                                          | `curl -i http://localhost:3001/api/estudiantes/12`                                                                                                                                                                           |
| 13  | **Contrato del Gateway**           | README §19 (JSON del contrato + tabla de qué necesita cada componente) y el esquema `StudentGatewayContract` en Swagger        | Captura de la sección del README y de Swagger → Schemas                                                                                                                                                                      |
| 14  | **Pruebas automatizadas exitosas** | Salida completa de Jest: `Test Suites: 14 passed`, `Tests: 165 passed`; opcional la tabla de cobertura                         | `npm test` y `npm run test:coverage`                                                                                                                                                                                         |

## Evidencias de manejo de errores (recomendadas)

```bash
curl -i http://localhost:3001/api/estudiantes/9999          # 404 STUDENT_NOT_FOUND
curl -i http://localhost:3001/api/estudiantes/abc           # 400 INVALID_ID
curl -i -X POST http://localhost:3001/api/estudiantes \
  -H "Content-Type: application/json" -d '{"firstName":"","programId":99999}'   # 422 VALIDATION_ERROR
curl -i -X POST http://localhost:3001/api/estudiantes -H "Content-Type: application/json" \
  -d '{"firstName":"A","lastName":"B","documentType":"CC","documentNumber":"1001000012","birthDate":"2000-01-01","gender":"male","programId":1}'   # 409 DUPLICATE_DOCUMENT_NUMBER
curl -i -X POST http://localhost:3001/api/estudiantes -H "Content-Type: application/json" \
  -d '{"firstName":"A","lastName":"B","documentType":"CC","documentNumber":"1077777777","birthDate":"2000-01-01","gender":"male","programId":999}'  # 422 PROGRAM_NOT_FOUND
docker compose stop db && curl -i http://localhost:3001/api/estudiantes/1    # 503 DATABASE_UNAVAILABLE
docker compose start db
```

## Checklist final antes de entregar

- [ ] `.env` **no** está en el repositorio (solo `.env.example`).
- [ ] `docker compose down -v && docker compose up -d && npm run migrate && npm run seed && npm test` funciona desde cero.
- [ ] `npm run lint` y `npm run format:check` sin errores.
- [ ] README revisado (URLs, puertos y nombres de tu equipo).
- [ ] Repositorio propio del módulo (no mezclado con Materias, Inscripciones ni Gateway).
