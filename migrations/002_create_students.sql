-- Entidad raíz del módulo. Programa 1:N Estudiante.
CREATE TABLE students (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  document_type   VARCHAR(10)  NOT NULL,
  document_number VARCHAR(20)  NOT NULL,
  birth_date      DATE         NOT NULL,
  gender          VARCHAR(10)  NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'active',
  program_id      INTEGER      NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT fk_students_program  FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT,
  CONSTRAINT uq_students_document UNIQUE (document_type, document_number),
  CONSTRAINT ck_students_document_type CHECK (document_type IN ('CC', 'TI', 'CE', 'PASSPORT')),
  CONSTRAINT ck_students_gender   CHECK (gender IN ('female', 'male', 'other')),
  CONSTRAINT ck_students_status   CHECK (status IN ('active', 'inactive', 'graduated', 'suspended'))
);

-- Índices para los filtros y ordenamientos más frecuentes.
CREATE INDEX idx_students_program_id      ON students (program_id);
CREATE INDEX idx_students_status          ON students (status);
CREATE INDEX idx_students_document_number ON students (document_number);
CREATE INDEX idx_students_last_name       ON students (last_name, first_name);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
