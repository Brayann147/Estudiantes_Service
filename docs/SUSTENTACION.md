# Preguntas probables en la sustentación (con respuesta corta)

## Arquitectura y sistemas distribuidos

1. **¿Por qué cada módulo tiene su propia base de datos y no hay foreign keys entre módulos?**
   Para que sean procesos realmente independientes: se pueden desplegar, escalar, versionar y fallar por separado. Una FK entre bases (o un esquema compartido) los acoplaría. Los ids de otros módulos se guardan como números sin restricción.

2. **¿Qué pierdes al no tener FK entre módulos? ¿Cómo lo mitigas?**
   Pierdes integridad referencial automática: podrían quedar inscripciones de un estudiante eliminado. Se mitiga validando en el punto de escritura (Inscripciones consulta `GET /api/estudiantes/{id}`), con borrado lógico o con eventos/compensaciones. Es consistencia eventual, un trade-off típico de microservicios.

3. **¿Cómo obtiene el Gateway el detalle de un estudiante sin que Estudiantes consulte a Materias/Inscripciones?**
   El Gateway orquesta: llama a cada módulo por separado y combina las respuestas. Estudiantes solo expone su contrato (`id`, `nombre`, `programa`).

4. **¿Por qué `nombre` y `programa` en español si el resto de campos está en inglés?**
   Porque son el contrato pedido por el enunciado. Los campos adicionales siguen el modelo sugerido (`firstName`, `programId`…). Están documentados y el contrato mínimo es estable.

5. **¿Qué pasa si PostgreSQL se cae?**
   La API sigue viva; `/health` responde 503 y los endpoints 503 `DATABASE_UNAVAILABLE`. El pool de `pg` reconecta solo cuando la base vuelve (probado: al reiniciar, `/health` vuelve a 200).

## Diseño interno

6. **¿Por qué separar rutas, controladores, servicios y repositorios?**
   Cada capa tiene una responsabilidad: rutas (URL + validación), controlador (HTTP), servicio (reglas de negocio), repositorio (SQL). Permite probar cada una aislada (los tests unitarios mockean repositorios) y cambiar la base sin tocar la lógica.

7. **¿Por qué `pg` y no un ORM?**
   SQL explícito, controlado y fácil de explicar; columnas listadas, parámetros siempre enlazados, sin magia. A cambio hay más código manual.

8. **¿Por qué JavaScript y no TypeScript?**
   Menos configuración (sin compilación) y foco en arquitectura. La validación en tiempo de ejecución la cubre Zod. Migrar a TS es directo.

9. **¿Cómo evitas la inyección SQL?**
   (a) Todos los valores viajan como parámetros `$1, $2…`; (b) `ORDER BY` se arma desde una lista blanca (`SORT_COLUMNS`), nunca con texto del cliente; (c) los nombres de columnas de `UPDATE` salen de un mapa fijo; (d) `LIKE` escapa `%` y `_`; (e) Zod rechaza `sortBy` desconocidos antes de llegar al repositorio, y el repositorio lo vuelve a verificar.

10. **¿Por qué 422 y también 400?**
    400: la petición está mal formada (JSON roto, id no numérico, query inválido). 422: el JSON es válido pero incumple reglas (campo faltante, fecha futura, `programId` inexistente).

11. **¿Cómo detectas «documento duplicado» sin condiciones de carrera?**
    Con la restricción `UNIQUE (document_type, document_number)` en PostgreSQL. Si dos peticiones simultáneas insertan lo mismo, la segunda falla con el código `23505` y el manejador de errores lo traduce por el _nombre de la restricción_ a un 409 `DUPLICATE_DOCUMENT_NUMBER`. Verificar antes de insertar (SELECT + INSERT) no sería seguro.

12. **¿Cómo garantizas que solo haya un documento principal?**
    Índice único parcial `ON documents (student_id) WHERE is_primary` + transacción en el servicio que primero desmarca el anterior y luego guarda el nuevo.

13. **¿Qué significa ON DELETE CASCADE / RESTRICT en tu esquema?**
    Al borrar un estudiante se borran su contacto y documentos (CASCADE, pertenecen al agregado). No se puede borrar un programa con estudiantes (RESTRICT → 409).

14. **¿Por qué `PUT` y `PATCH` son distintos?**
    PUT reemplaza el recurso completo (todos los campos obligatorios; los opcionales omitidos quedan en `null`). PATCH cambia solo lo enviado (al menos un campo). Ambos rechazan campos desconocidos.

15. **¿Cómo funciona la paginación y qué pasa con páginas fuera de rango?**
    `LIMIT pageSize OFFSET (pageNumber-1)*pageSize` más un `COUNT(*)` con los mismos filtros para `totalItems`/`totalPages`. Una página fuera de rango devuelve `data: []` con 200. El orden incluye `id` como desempate para que las páginas sean estables.

16. **¿Por qué el estudiante y el documento tienen ambos «número de documento»?**
    `students.document_*` es la identificación del estudiante (filtrable/único); `documents` es la colección de documentos soportados (carné, pasaporte, etc.). Son independientes por el modelo del enunciado.

## Docker, pruebas y operación

17. **¿Por qué el healthcheck y `depends_on: service_healthy`?**
    Para que la API no arranque antes de que PostgreSQL acepte conexiones (`pg_isready`).

18. **¿Cómo se persisten los datos?**
    Volumen nombrado `estudiantes_pgdata`. `docker compose down` los conserva; `down -v` los borra.

19. **¿Cómo pruebas sin dañar tus datos de desarrollo?**
    Jest usa `estudiantes_db_test`, se crea y se recrea el esquema sola, y hay una salvaguarda que aborta si el nombre de la base no termina en `_test`.

20. **¿Qué diferencia hay entre tus pruebas unitarias y las de integración?**
    Las unitarias no usan base (validadores, utilidades, mapeo de errores, servicio con repositorios simulados). Las de integración levantan la app con Supertest contra PostgreSQL real y prueban el flujo HTTP completo, incluidas restricciones de BD.

21. **¿Cómo escalarías el módulo?**
    Es _stateless_ (sin sesión en memoria): se pueden correr varias réplicas detrás del Gateway/balanceador, ajustando `DB_POOL_MAX` para no exceder las conexiones de PostgreSQL.

## Posibles mejoras

Autenticación (JWT) validada en el Gateway · rate limiting · `unaccent` para el filtro `name` · borrado lógico · eventos (p. ej. `student.deleted`) para que Inscripciones limpie sus datos · trazabilidad con `X-Request-Id` · métricas Prometheus · migraciones con `down` · CI (GitHub Actions) que ejecute lint + tests.
