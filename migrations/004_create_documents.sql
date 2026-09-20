-- Estudiante 1:N Documento.
CREATE TABLE documents (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id      INTEGER      NOT NULL,
  type            VARCHAR(20)  NOT NULL,
  number          VARCHAR(30)  NOT NULL,
  issue_date      DATE,
  expiration_date DATE,
  is_primary      BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT fk_documents_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT uq_documents_type_number UNIQUE (type, number),
  CONSTRAINT ck_documents_type CHECK (
    type IN ('CC', 'TI', 'CE', 'PASSPORT', 'BIRTH_CERTIFICATE', 'STUDENT_ID', 'OTHER')
  ),
  CONSTRAINT ck_documents_dates CHECK (
    issue_date IS NULL OR expiration_date IS NULL OR expiration_date >= issue_date
  )
);

CREATE INDEX idx_documents_student_id ON documents (student_id);

-- Un estudiante solo puede tener UN documento principal.
CREATE UNIQUE INDEX uq_documents_one_primary ON documents (student_id) WHERE is_primary;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
