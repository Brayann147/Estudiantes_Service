-- Fotografía del estudiante (Lab 4). El archivo vive en el almacenamiento de objetos (S3);
-- aquí solo se guardan sus metadatos. La URL de acceso se firma en cada lectura y nunca se persiste.
ALTER TABLE students
  ADD COLUMN photo_key           VARCHAR(255),
  ADD COLUMN photo_original_name VARCHAR(255),
  ADD COLUMN photo_content_type  VARCHAR(20),
  ADD COLUMN photo_size_bytes    INTEGER,
  ADD COLUMN photo_uploaded_at   TIMESTAMPTZ,
  ADD CONSTRAINT ck_students_photo_complete CHECK (
    (photo_key IS NULL AND photo_original_name IS NULL AND photo_content_type IS NULL
       AND photo_size_bytes IS NULL AND photo_uploaded_at IS NULL)
    OR (photo_key IS NOT NULL AND photo_original_name IS NOT NULL AND photo_content_type IS NOT NULL
       AND photo_size_bytes IS NOT NULL AND photo_uploaded_at IS NOT NULL)
  ),
  ADD CONSTRAINT ck_students_photo_type CHECK (photo_content_type IN ('image/jpeg', 'image/png')),
  ADD CONSTRAINT ck_students_photo_size CHECK (photo_size_bytes BETWEEN 1 AND 2097152),
  ADD CONSTRAINT uq_students_photo_key  UNIQUE (photo_key);
