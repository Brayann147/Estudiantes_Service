const request = require('supertest');
const { createApp } = require('../../src/app');

const app = createApp();
const api = () => request(app);

let sequence = 0;
const next = () => ++sequence;

const programPayload = (overrides = {}) => {
  const n = next();
  return {
    code: `PRG${n}`,
    name: `Programa ${n}`,
    faculty: 'Facultad de Pruebas',
    modality: 'onsite',
    ...overrides,
  };
};

const studentPayload = (programId, overrides = {}) => {
  const n = next();
  return {
    firstName: 'Laura',
    lastName: 'Gómez',
    documentType: 'CC',
    documentNumber: `9${String(n).padStart(9, '0')}`,
    birthDate: '2002-06-08',
    gender: 'female',
    programId,
    ...overrides,
  };
};

async function createProgram(overrides = {}) {
  const res = await api().post('/api/programas').send(programPayload(overrides));
  if (res.status !== 201) throw new Error(`createProgram falló: ${JSON.stringify(res.body)}`);
  return res.body;
}

async function createStudent(programId, overrides = {}) {
  const res = await api().post('/api/estudiantes').send(studentPayload(programId, overrides));
  if (res.status !== 201) throw new Error(`createStudent falló: ${JSON.stringify(res.body)}`);
  return res.body;
}

const contactPayload = (overrides = {}) => {
  const n = next();
  return {
    email: `estudiante${n}@example.com`,
    phone: '3101234567',
    address: 'Calle 10 # 5-20, Tunja',
    emergencyContactName: 'Marta Gómez',
    emergencyContactPhone: '3209876543',
    ...overrides,
  };
};

const documentPayload = (overrides = {}) => {
  const n = next();
  return {
    type: 'STUDENT_ID',
    number: `UPTC-${String(n).padStart(5, '0')}`,
    issueDate: '2024-02-01',
    expirationDate: '2028-01-31',
    isPrimary: false,
    ...overrides,
  };
};

module.exports = {
  api,
  programPayload,
  studentPayload,
  contactPayload,
  documentPayload,
  createProgram,
  createStudent,
};
