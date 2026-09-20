-- Función reutilizable: mantiene updated_at al día en cada UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE programs (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       VARCHAR(20)  NOT NULL,
  name       VARCHAR(150) NOT NULL,
  faculty    VARCHAR(150) NOT NULL,
  modality   VARCHAR(10)  NOT NULL,
  status     VARCHAR(10)  NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_programs_code     UNIQUE (code),
  CONSTRAINT ck_programs_modality CHECK (modality IN ('onsite', 'online', 'hybrid')),
  CONSTRAINT ck_programs_status   CHECK (status IN ('active', 'inactive'))
);

CREATE TRIGGER trg_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
