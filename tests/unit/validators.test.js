const {
  createStudentBody,
  patchStudentBody,
  listStudentsQuery,
} = require('../../src/validators/student.validator');
const { contactBody } = require('../../src/validators/contact.validator');
const {
  createDocumentBody,
  patchDocumentBody,
} = require('../../src/validators/document.validator');
const { createProgramBody } = require('../../src/validators/program.validator');
const { toDetails } = require('../../src/validators/common');

const validStudent = {
  firstName: '  Laura ',
  lastName: 'Gómez',
  documentType: 'CC',
  documentNumber: '1001000012',
  birthDate: '2002-06-08',
  gender: 'female',
  programId: 1,
};

describe('validators/student', () => {
  it('acepta un estudiante válido, recorta espacios y aplica status por defecto', () => {
    const result = createStudentBody.safeParse(validStudent);
    expect(result.success).toBe(true);
    expect(result.data.firstName).toBe('Laura');
    expect(result.data.status).toBe('active');
  });

  it.each([
    ['documentType', 'XX'],
    ['gender', 'robot'],
    ['status', 'volando'],
    ['birthDate', '08/06/2002'],
    ['birthDate', '2999-01-01'],
    ['birthDate', '1800-01-01'],
    ['documentNumber', '12'],
    ['documentNumber', "1' OR '1'='1"],
    ['programId', '1'],
    ['programId', 0],
    ['firstName', ''],
    ['lastName', 'x'.repeat(101)],
  ])('rechaza %s = %j', (field, value) => {
    const result = createStudentBody.safeParse({ ...validStudent, [field]: value });
    expect(result.success).toBe(false);
    expect(toDetails(result.error.issues)[0].field).toBe(field);
  });

  it('rechaza campos desconocidos indicando cuáles son', () => {
    const result = createStudentBody.safeParse({ ...validStudent, isAdmin: true });
    expect(result.success).toBe(false);
    expect(toDetails(result.error.issues)).toEqual([
      { field: 'isAdmin', message: 'Campo no permitido' },
    ]);
  });

  it('indica "Es obligatorio" para los campos faltantes', () => {
    const result = createStudentBody.safeParse({});
    const details = toDetails(result.error.issues);
    expect(details).toContainEqual({ field: 'firstName', message: 'Es obligatorio' });
  });

  it('PATCH exige al menos un campo', () => {
    expect(patchStudentBody.safeParse({}).success).toBe(false);
    expect(patchStudentBody.safeParse({ status: 'inactive' }).success).toBe(true);
  });
});

describe('validators/student - query del listado', () => {
  it('aplica valores por defecto', () => {
    const result = listStudentsQuery.parse({});
    expect(result).toMatchObject({
      pageNumber: 1,
      pageSize: 10,
      sortBy: 'id',
      sortDirection: 'asc',
    });
  });

  it('convierte textos a números y normaliza sortDirection', () => {
    const result = listStudentsQuery.parse({
      pageNumber: '2',
      pageSize: '25',
      sortDirection: 'DESC',
      programId: '3',
    });
    expect(result).toMatchObject({
      pageNumber: 2,
      pageSize: 25,
      sortDirection: 'desc',
      programId: 3,
    });
  });

  it('solo permite ordenar por campos de la lista blanca', () => {
    expect(listStudentsQuery.safeParse({ sortBy: 'lastName' }).success).toBe(true);
    expect(listStudentsQuery.safeParse({ sortBy: 'password' }).success).toBe(false);
    expect(listStudentsQuery.safeParse({ sortBy: 'id; DROP TABLE students' }).success).toBe(false);
  });

  it('limita pageSize a 100 y exige pageNumber >= 1', () => {
    expect(listStudentsQuery.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(listStudentsQuery.safeParse({ pageNumber: '0' }).success).toBe(false);
  });

  it('trata los filtros vacíos como no enviados y normaliza el correo', () => {
    const result = listStudentsQuery.parse({ name: '', email: ' A@Example.COM ' });
    expect(result.name).toBeUndefined();
    expect(result.email).toBe('a@example.com');
  });
});

describe('validators/contact', () => {
  it('normaliza el correo y valida el teléfono', () => {
    const ok = contactBody.safeParse({ email: ' Ana@Example.COM ', phone: '+573101234567' });
    expect(ok.success).toBe(true);
    expect(ok.data.email).toBe('ana@example.com');

    expect(contactBody.safeParse({ email: 'ana@example.com', phone: '12' }).success).toBe(false);
    expect(contactBody.safeParse({ email: 'ana', phone: '3101234567' }).success).toBe(false);
  });
});

describe('validators/document', () => {
  it('isPrimary es false por defecto', () => {
    const result = createDocumentBody.parse({ type: 'CC', number: '1001234567' });
    expect(result.isPrimary).toBe(false);
  });

  it('rechaza expiración anterior a la expedición', () => {
    const result = createDocumentBody.safeParse({
      type: 'CC',
      number: '1001234567',
      issueDate: '2025-01-01',
      expirationDate: '2024-12-31',
    });
    expect(result.success).toBe(false);
    expect(toDetails(result.error.issues)[0].field).toBe('expirationDate');
  });

  it('PATCH exige al menos un campo', () => {
    expect(patchDocumentBody.safeParse({}).success).toBe(false);
    expect(patchDocumentBody.safeParse({ isPrimary: true }).success).toBe(true);
  });
});

describe('validators/program', () => {
  it('convierte el código a mayúsculas', () => {
    const result = createProgramBody.parse({
      code: ' isis ',
      name: 'Ingeniería de Sistemas',
      faculty: 'Facultad de Ingeniería',
      modality: 'onsite',
    });
    expect(result.code).toBe('ISIS');
    expect(result.status).toBe('active');
  });
});
