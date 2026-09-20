# Módulo Estudiantes — Laboratorio 3, Sistemas Distribuidos (UPTC)

## 1. Descripción del módulo

Microservicio REST **independiente** que administra estudiantes y sus datos asociados. Forma parte de un sistema de cuatro procesos (Estudiantes, Materias, Inscripciones y API Gateway); **este repositorio implementa solo el módulo Estudiantes**.

- Base de datos propia: PostgreSQL `estudiantes_db`.
- Puerto propio: `3001` (API) y `5433` (PostgreSQL publicado en tu máquina).
- CRUD completo de **Estudiantes, Programas, Contactos y Documentos**.
- Paginación (`pageNumber`, `pageSize`), ordenamiento (`sortBy`, `sortDirection`) y cinco filtros en `/api/estudiantes`.
- Documentación Swagger/OpenAPI en `/api-docs`.
- Sin llaves foráneas hacia otros módulos y sin código compartido con ellos.

Modelo de datos (todas las FK son internas a este módulo):

```
Programa 1 ──── N Estudiante 1 ──── 1 Contacto
                      │
                      └──── N Documento
```

## 2. Arquitectura

Arquitectura en capas; cada capa solo conoce a la inmediatamente inferior:

```
Petición HTTP
   │
   ▼
routes/        define URL + middlewares (validate) + controlador
   ▼
middlewares/   validate (Zod) → errorHandler global → notFound
   ▼
controllers/   traduce HTTP ↔ servicio (sin SQL, sin reglas de negocio)
   ▼
services/      reglas de negocio (programa existe, un solo documento principal, 1:1 contacto…)
   ▼
repositories/  ÚNICO lugar con SQL (parametrizado, sin SELECT *)
   ▼
database/      pool de pg, transacciones, migraciones, seeders
```

```
src/
  app.js  server.js
  config/        env.js (valida .env con Zod) · logger.js
  constants/     enums.js (valores permitidos y listas blancas)
  controllers/   student · program · contact · document · health
  database/      pool.js · migrate.js · seed.js
  docs/          openapi.js · paths.js · schemas.js  (Swagger)
  errors/        AppError · catálogo de errores · mapeo de errores de PostgreSQL
  middlewares/   validate.js · errorHandler.js · notFound.js
  repositories/  student · program · contact · document
  routes/        index · student · program · contact · document
  services/      student · program · contact · document · health
  utils/         pagination.js · sql.js (WhereBuilder, escapeLike, buildUpdateSet)
  validators/    esquemas Zod por entidad
tests/           unit/ · integration/ · helpers/ · setup/
migrations/      001…004 (.sql)
seeders/         001_programs.js · 002_students.js
docs/            EVIDENCIAS.md · SUSTENTACION.md
```

## 3. Tecnologías

Node.js 22 · Express 5 · PostgreSQL 16 (driver `pg`, sin ORM) · Zod 4 (validación) · swagger-ui-express (OpenAPI 3.0.3) · Helmet + CORS + Morgan · dotenv · Jest 30 + Supertest · ESLint 10 + Prettier · Docker y Docker Compose.

## 4. Requisitos previos

- Node.js **22 LTS** recomendado (mínimo 20.19; verifica con `node -v`) y npm.
- Docker Desktop en ejecución (`docker -v`, `docker compose version`).

## 5. Instalación

```bash
git clone <url-de-tu-repositorio> estudiantes-service
cd estudiantes-service

cp .env.example .env          # Windows CMD: copy .env.example .env
# Edita .env y cambia DB_PASSWORD

docker compose up -d          # levanta PostgreSQL
npm install
npm run migrate               # crea las tablas
npm run seed                  # datos de prueba (7 programas, 25 estudiantes)
npm run dev                   # API en http://localhost:3001
```

Comprueba: <http://localhost:3001/health> y <http://localhost:3001/api-docs>.

## 6. Variables de entorno

| Variable                  | Ejemplo               | Descripción                                                             |
| ------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                | `development`         | `development` \| `test` \| `production`                                 |
| `PORT`                    | `3001`                | Puerto de la API                                                        |
| `LOG_LEVEL`               | `info`                | `error`, `warn`, `info`, `debug`, `silent`                              |
| `CORS_ORIGIN`             | `*`                   | Orígenes permitidos separados por coma (en producción, lista explícita) |
| `DB_HOST`                 | `localhost`           | Host de PostgreSQL                                                      |
| `DB_PORT`                 | `5433`                | Puerto **publicado en tu máquina** (dentro de Docker es 5432)           |
| `DB_USER` / `DB_PASSWORD` | —                     | Credenciales (obligatorias, sin valor por defecto en el código)         |
| `DB_NAME`                 | `estudiantes_db`      | Base de datos independiente del módulo                                  |
| `DB_NAME_TEST`            | `estudiantes_db_test` | Base usada solo por Jest                                                |
| `DB_POOL_MAX`             | `10`                  | Conexiones máximas del pool                                             |

`.env` está en `.gitignore`; solo se versiona `.env.example` (con valores de ejemplo, sin secretos reales). Si falta una variable obligatoria, la app termina con un mensaje claro.

## 7. Configuración de PostgreSQL

El contenedor se crea con `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` tomados de `.env`. Esos valores **solo se aplican la primera vez** que se crea el volumen; si luego cambias la clave en `.env`, ejecuta `docker compose down -v` (borra los datos) y vuelve a levantar.

Si ya tienes un PostgreSQL local usando el puerto 5433, cambia `DB_PORT` en `.env`.

Conexión manual: `psql -h localhost -p 5433 -U <DB_USER> -d estudiantes_db`.

## 8. Comandos Docker

```bash
docker compose up -d                        # solo PostgreSQL (flujo de desarrollo)
docker compose ps                           # estado y healthcheck (debe decir "healthy")
docker compose logs -f db                   # logs de PostgreSQL
docker compose stop                         # detiene sin borrar datos
docker compose down                         # elimina contenedores; el volumen (datos) se conserva
docker compose down -v                      # elimina también el volumen (borra los datos)

# API también dentro de Docker (ejecuta las migraciones al arrancar):
docker compose --profile full up -d --build
```

Persistencia: volumen `estudiantes_pgdata`. Healthcheck de PostgreSQL con `pg_isready`; el servicio `api` espera a que esté `healthy`.

## 9. Migraciones

Ejecutor propio y mínimo (`src/database/migrate.js`): aplica en orden los `migrations/*.sql` pendientes, cada uno en una transacción, y los registra en `schema_migrations`.

```bash
npm run migrate          # aplica las pendientes
npm run migrate:reset    # BORRA todo el esquema y vuelve a migrar (bloqueado en producción)
```

| Migración                  | Contenido                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `001_create_programs.sql`  | tabla `programs`, función/trigger `updated_at`                                                         |
| `002_create_students.sql`  | tabla `students`, FK a `programs`, único `(document_type, document_number)`, índices                   |
| `003_create_contacts.sql`  | tabla `contacts`, `student_id` **UNIQUE** (1:1), correo único sin distinguir mayúsculas                |
| `004_create_documents.sql` | tabla `documents`, único `(type, number)`, un solo documento principal por estudiante (índice parcial) |

## 10. Seeders

```bash
npm run seed
```

Inserta 7 programas y 25 estudiantes con contacto y documentos. Es **idempotente** (`ON CONFLICT DO NOTHING`): puedes ejecutarlo varias veces. Sobre una base vacía, _Laura Gómez_ queda con `id = 12` (el ejemplo del contrato con el Gateway). Está deshabilitado con `NODE_ENV=production`.

## 11. Ejecución en desarrollo

```bash
npm run dev      # node --watch: reinicia al guardar cambios
npm run lint     # ESLint
npm run format   # Prettier
```

## 12. Ejecución en producción

```bash
docker compose --profile full up -d --build     # API + PostgreSQL en contenedores
# o, sin Docker para la API:
NODE_ENV=production npm ci --omit=dev && npm run migrate && npm start
```

En producción: `CORS_ORIGIN` con orígenes explícitos, contraseña fuerte, TLS en un proxy inverso y logs en formato `combined`. La imagen usa un usuario no-root, build en dos etapas y `HEALTHCHECK`. Apagado ordenado con `SIGTERM`/`SIGINT` (cierra el servidor y el pool).

## 13. Ejecución de pruebas

```bash
docker compose up -d     # PostgreSQL debe estar activo
npm test                 # toda la suite (unitarias + integración)
npm run test:coverage    # con cobertura
```

- Las pruebas usan la base **`estudiantes_db_test`**, que se crea sola; en cada corrida se recrea su esquema. Nunca tocan `estudiantes_db` (hay una salvaguarda que aborta si la base no termina en `_test`).
- **Unitarias** (sin base de datos): validadores Zod, paginación, utilidades SQL, mapeo de errores de PostgreSQL, manejador de errores, servicio con repositorios simulados, especificación OpenAPI.
- **Integración** (HTTP real con Supertest + PostgreSQL): `/health`, CRUD de estudiantes, programas, contactos y documentos, paginación, ordenamiento, filtros, estudiante inexistente, documento duplicado, programa inexistente, errores de conexión.

## 14. URL de Swagger

- Interfaz: <http://localhost:3001/api-docs>
- Especificación JSON: <http://localhost:3001/api-docs.json>

## 15. Lista de endpoints

| Método                            | Ruta                                     | Descripción                                  |
| --------------------------------- | ---------------------------------------- | -------------------------------------------- |
| GET                               | `/health`                                | Estado de la API y de PostgreSQL (200 / 503) |
| GET                               | `/api/estudiantes`                       | Lista paginada, ordenable y filtrable        |
| GET                               | `/api/estudiantes/:id`                   | Detalle (**contrato del Gateway**)           |
| POST                              | `/api/estudiantes`                       | Crear                                        |
| PUT                               | `/api/estudiantes/:id`                   | Reemplazar (todos los campos)                |
| PATCH                             | `/api/estudiantes/:id`                   | Actualizar parcialmente                      |
| DELETE                            | `/api/estudiantes/:id`                   | Eliminar (cascada a contacto y documentos)   |
| GET · POST                        | `/api/programas`                         | Listar (paginado) · crear                    |
| GET · PUT · PATCH · DELETE        | `/api/programas/:id`                     | Consultar · reemplazar · parcial · eliminar  |
| GET · POST · PUT · PATCH · DELETE | `/api/estudiantes/:studentId/contacto`   | Contacto principal (1:1)                     |
| GET · POST                        | `/api/estudiantes/:studentId/documentos` | Documentos del estudiante                    |
| GET · PUT · PATCH · DELETE        | `/api/documentos/:id`                    | Un documento                                 |

**Query params de `GET /api/estudiantes`**

| Parámetro        | Valores / comportamiento                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pageNumber`     | entero ≥ 1 (defecto 1)                                                                                                                 |
| `pageSize`       | 1–100 (defecto 10)                                                                                                                     |
| `sortBy`         | `id` (defecto), `firstName`, `lastName`, `documentNumber`, `birthDate`, `status`, `programId`, `createdAt`, `updatedAt` — lista blanca |
| `sortDirection`  | `asc` (defecto) \| `desc`                                                                                                              |
| `name`           | contiene el texto en _nombre + apellido_, sin distinguir mayúsculas                                                                    |
| `programId`      | id del programa                                                                                                                        |
| `status`         | `active`, `inactive`, `graduated`, `suspended`                                                                                         |
| `documentNumber` | coincidencia exacta                                                                                                                    |
| `email`          | correo exacto del contacto principal (sin distinguir mayúsculas)                                                                       |

Respuesta paginada:

```json
{ "data": [], "pagination": { "pageNumber": 1, "pageSize": 10, "totalItems": 25, "totalPages": 3 } }
```

**Errores** (siempre la misma estructura):

```json
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "El estudiante solicitado no existe",
    "details": []
  }
}
```

| HTTP | Códigos (`error.code`)                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400  | `INVALID_ID`, `INVALID_QUERY_PARAMS`, `INVALID_JSON`                                                                                                                        |
| 404  | `STUDENT_NOT_FOUND`, `PROGRAM_NOT_FOUND`, `CONTACT_NOT_FOUND`, `DOCUMENT_NOT_FOUND`, `ROUTE_NOT_FOUND`                                                                      |
| 409  | `DUPLICATE_DOCUMENT_NUMBER`, `DUPLICATE_DOCUMENT`, `DUPLICATE_EMAIL`, `DUPLICATE_PROGRAM_CODE`, `CONTACT_ALREADY_EXISTS`, `PROGRAM_HAS_STUDENTS`, `DB_CONSTRAINT_VIOLATION` |
| 422  | `VALIDATION_ERROR`, `PROGRAM_NOT_FOUND` (programId del cuerpo no existe)                                                                                                    |
| 500  | `INTERNAL_ERROR` (sin detalles internos al cliente)                                                                                                                         |
| 503  | `DATABASE_UNAVAILABLE` (PostgreSQL no responde)                                                                                                                             |

## 16. Ejemplos con cURL

(En Windows PowerShell usa `curl.exe` y comillas dobles escapadas, o ejecuta estos comandos en Git Bash / WSL.)

```bash
B=http://localhost:3001

# Salud
curl $B/health

# Listar con paginación, orden y filtros
curl "$B/api/estudiantes?pageNumber=1&pageSize=10&sortBy=lastName&sortDirection=asc"
curl "$B/api/estudiantes?name=Laura"
curl "$B/api/estudiantes?programId=2"
curl "$B/api/estudiantes?status=active"
curl "$B/api/estudiantes?documentNumber=1001000012"
curl "$B/api/estudiantes?email=laura.gomez@example.com"

# Contrato para el Gateway
curl $B/api/estudiantes/12

# Crear programa y estudiante
curl -X POST $B/api/programas -H "Content-Type: application/json" \
  -d '{"code":"MECA","name":"Ingeniería Mecánica","faculty":"Facultad de Ingeniería","modality":"onsite"}'

curl -X POST $B/api/estudiantes -H "Content-Type: application/json" \
  -d '{"firstName":"Ana","lastName":"Ruiz","documentType":"CC","documentNumber":"1098765432","birthDate":"2003-04-15","gender":"female","programId":1}'

# Actualizar
curl -X PATCH $B/api/estudiantes/26 -H "Content-Type: application/json" -d '{"status":"inactive"}'
curl -X PUT   $B/api/estudiantes/26 -H "Content-Type: application/json" \
  -d '{"firstName":"Ana","lastName":"Ruiz","documentType":"CC","documentNumber":"1098765432","birthDate":"2003-04-15","gender":"female","status":"active","programId":2}'

# Contacto (1:1)
curl -X POST $B/api/estudiantes/26/contacto -H "Content-Type: application/json" \
  -d '{"email":"ana.ruiz@example.com","phone":"3101234567","address":"Calle 10 # 5-20, Tunja"}'
curl $B/api/estudiantes/26/contacto

# Documentos
curl -X POST $B/api/estudiantes/26/documentos -H "Content-Type: application/json" \
  -d '{"type":"STUDENT_ID","number":"UPTC-00026","issueDate":"2024-02-01","expirationDate":"2028-01-31","isPrimary":true}'
curl $B/api/estudiantes/26/documentos
curl -X DELETE $B/api/documentos/34

# Eliminar
curl -X DELETE $B/api/estudiantes/26 -i
```

## 17. Decisiones de diseño

- **JavaScript moderno (CommonJS) y no TypeScript.** El laboratorio evalúa arquitectura distribuida, no tipado; JS evita una etapa de compilación, hace Docker/Jest más simples y es más fácil de explicar. La seguridad de tipos en las fronteras la da Zod (validación en tiempo de ejecución). Migrar a TypeScript sería directo porque las capas ya están separadas.
- **`pg` sin ORM.** El SQL es explícito, visible en la sustentación, con columnas listadas (nunca `SELECT *`) y 100 % parametrizado. Los `ORDER BY` salen de una lista blanca (`SORT_COLUMNS`), nunca del texto del cliente; `sortBy` se valida además con Zod (defensa en profundidad).
- **Express 5.** Propaga automáticamente los errores de handlers `async` al manejador global, sin `try/catch` ni wrappers en cada controlador.
- **Validación en el borde con Zod** (`params` → 400, `query` → 400, `body` → 422). Los cuerpos son _estrictos_: un campo desconocido se rechaza con su nombre. Los valores normalizados (correo en minúsculas, código en mayúsculas, texto recortado) llegan al servicio.
- **400 vs 422.** 400 = la petición está mal formada (JSON roto, id no numérico, query inválido); 422 = el JSON es correcto pero incumple reglas de validación o referencia un `programId` inexistente.
- **503 para PostgreSQL caído** (además de los códigos pedidos): distingue «el servicio no puede atender ahora» de un bug (500). Si tu docente prefiere solo 500, se cambia en `Errors.databaseUnavailable`.
- **Errores de base de datos traducidos** (`errors/databaseErrors.js`): las restricciones `UNIQUE`/`FK`/`CHECK` son la fuente de verdad y se convierten en respuestas 409/422 por el _nombre de la restricción_. Así no hay condiciones de carrera entre «verificar y luego insertar».
- **Un documento principal por estudiante:** índice único parcial en BD + transacción en el servicio (desmarca el anterior e inserta/actualiza de forma atómica).
- **`updated_at` con trigger** en PostgreSQL, no en la aplicación.
- **Borrado físico** (`DELETE` real, con `ON DELETE CASCADE` hacia contacto y documentos). Un programa con estudiantes no se puede eliminar (409).
- **Enumeraciones en inglés** (`active`, `female`, `onsite`…) como en los ejemplos del enunciado; textos de error y documentación en español.
- **Migraciones propias** en SQL plano (sin dependencias): fáciles de leer y explicar, transaccionales y con bloqueo consultivo para evitar ejecuciones simultáneas.
- **Contrato con el Gateway:** `nombre` (=`firstName lastName`) y `programa` (nombre del programa) se calculan en el servicio; el resto de campos son adicionales y no rompen el contrato.

## 18. Cómo se garantiza la independencia del módulo

| Requisito                                   | Cómo se cumple                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositorio, ciclo de vida y puerto propios | Proyecto autocontenido; arranca, se prueba y se despliega solo (`3001`)                                                                                             |
| Base de datos propia                        | `estudiantes_db` en su propio contenedor/volumen; ninguna conexión a otras bases                                                                                    |
| Sin foreign keys entre módulos              | Las 3 FK del esquema son internas (`students→programs`, `contacts→students`, `documents→students`); no existe ninguna columna que referencie Materias/Inscripciones |
| Sin acoplamiento de código                  | No importa ni copia código de otros módulos; no hay librerías compartidas                                                                                           |
| No consulta a otros módulos                 | Cero llamadas HTTP salientes; el módulo solo _responde_                                                                                                             |
| Sin datos de otros módulos                  | No almacena materias ni inscripciones                                                                                                                               |
| Sin base compartida                         | Ningún supuesto sobre otras bases; los otros módulos referencian estudiantes solo por su `id` numérico                                                              |

Verificación rápida: `\d+ students`, `\d+ contacts`, `\d+ documents`, `\d+ programs` en `psql` (o el script de `docs/EVIDENCIAS.md`).

## 19. Cómo se integrará con el Gateway

El Gateway enruta `/api/estudiantes/**` a `http://<host-estudiantes>:3001` (URL configurable en el Gateway) y arma `GET /api/estudiantes/{id}/detalle` combinando este módulo con Materias e Inscripciones. **Este módulo no implementa el gateway ni consulta a los otros.**

### Contrato que ofrece Estudiantes

`GET /api/estudiantes/{id}` → `200`

```json
{
  "id": 12,
  "nombre": "Laura Gómez",
  "programa": "Ingeniería de Sistemas",
  "firstName": "Laura",
  "lastName": "Gómez",
  "documentType": "CC",
  "documentNumber": "1001000012",
  "birthDate": "2002-06-08",
  "gender": "female",
  "status": "active",
  "programId": 1,
  "email": "laura.gomez@example.com",
  "createdAt": "2026-09-19T22:58:05.242Z",
  "updatedAt": "2026-09-19T22:58:05.242Z"
}
```

- **Garantizados** (contrato mínimo estable): `id` (entero), `nombre` (texto), `programa` (texto).
- Los demás campos son informativos; el Gateway no debe depender de ellos.
- Errores: `404` `STUDENT_NOT_FOUND` si no existe; `400` `INVALID_ID` si el id no es un entero positivo; `503` `DATABASE_UNAVAILABLE` si PostgreSQL falla. Siempre con el formato `{ "error": { "code", "message", "details" } }`.

### Qué necesitan los otros componentes de este módulo

| Componente               | Necesita                                            | Cómo                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gateway** (`/detalle`) | Datos del estudiante                                | `GET /api/estudiantes/{id}` (contrato anterior). Si responde 404, el Gateway devuelve 404 y no consulta a los demás; si responde 5xx/timeout, devuelve 502/503 o una respuesta parcial (decisión del Gateway) |
| **Inscripciones**        | Saber que un estudiante existe antes de inscribirlo | Guarda `estudianteId` como **entero sin FK**; valida con `GET /api/estudiantes/{id}` (200 = existe, 404 = no existe) directamente o a través del Gateway                                                      |
| **Materias**             | Nada                                                | No depende de Estudiantes                                                                                                                                                                                     |

### Flujo sugerido de `/detalle` (lo implementa el equipo del Gateway)

```
GET /api/estudiantes/12/detalle
  1) GET  {ESTUDIANTES_URL}/api/estudiantes/12          → { id, nombre, programa, … }
  2) GET  {INSCRIPCIONES_URL}/api/inscripciones?…12…    → inscripciones del estudiante   (contrato de Inscripciones)
  3) GET  {MATERIAS_URL}/api/materias/{materiaId}       → datos de cada materia          (contrato de Materias)
  4) el Gateway combina 1–3 y responde
```

## 20. Limitaciones conocidas

- **Sin integridad referencial entre módulos** (por diseño del laboratorio): eliminar un estudiante no elimina ni bloquea sus inscripciones en el otro módulo. La consistencia queda en manos del Gateway/Inscripciones (validar antes de crear, o borrado lógico/eventos como mejora).
- Borrado físico: no hay historial ni papelera.
- Sin autenticación/autorización ni límite de peticiones (rate limiting).
- El filtro `name` no ignora tildes (`Gomez` no encuentra `Gómez`); se resolvería con la extensión `unaccent`.
- El listado de documentos de un estudiante no está paginado (se asume un número pequeño).
- Un solo contacto principal por estudiante (relación 1:1 pedida).
- Documento del estudiante (`students.document_*`) y `documents` son independientes: crear un estudiante no crea automáticamente su documento principal.
- El ejecutor de migraciones solo avanza (no hay _rollback_/`down`); en desarrollo se usa `migrate:reset`.
- Las credenciales de la BD viajan por variables de entorno; en un despliegue real conviene un gestor de secretos.
