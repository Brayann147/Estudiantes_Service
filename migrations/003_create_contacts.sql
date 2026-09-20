-- Estudiante 1:1 Contacto (student_id UNIQUE garantiza un solo contacto principal).
CREATE TABLE contacts (
  id                      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id              INTEGER      NOT NULL,
  email                   VARCHAR(254) NOT NULL,
  phone                   VARCHAR(20)  NOT NULL,
  address                 VARCHAR(255),
  emergency_contact_name  VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT fk_contacts_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT uq_contacts_student UNIQUE (student_id)
);

-- Correo único sin distinguir mayúsculas/minúsculas.
CREATE UNIQUE INDEX uq_contacts_email ON contacts (lower(email));

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
