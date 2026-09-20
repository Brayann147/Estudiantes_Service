jest.mock('../../src/repositories/student.repository');
jest.mock('../../src/repositories/program.repository');

const studentRepository = require('../../src/repositories/student.repository');
const programRepository = require('../../src/repositories/program.repository');
const studentService = require('../../src/services/student.service');

const row = {
  id: 12,
  firstName: 'Laura',
  lastName: 'Gómez',
  documentType: 'CC',
  documentNumber: '1001000012',
  birthDate: '2002-06-08',
  gender: 'female',
  status: 'active',
  programId: 1,
  programName: 'Ingeniería de Sistemas',
  email: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => jest.resetAllMocks());

describe('student.service', () => {
  it('toStudentResponse cumple el contrato del Gateway (id, nombre, programa)', () => {
    const dto = studentService.toStudentResponse(row);
    expect(dto).toMatchObject({
      id: 12,
      nombre: 'Laura Gómez',
      programa: 'Ingeniería de Sistemas',
      email: null,
    });
    expect(dto.programName).toBeUndefined(); // campo interno, no se expone
  });

  it('getById lanza STUDENT_NOT_FOUND si el repositorio no encuentra al estudiante', async () => {
    studentRepository.findById.mockResolvedValue(null);
    await expect(studentService.getById(5)).rejects.toMatchObject({
      status: 404,
      code: 'STUDENT_NOT_FOUND',
    });
  });

  it('create verifica el programa y NO inserta si no existe', async () => {
    programRepository.existsById.mockResolvedValue(false);

    await expect(studentService.create({ programId: 99 })).rejects.toMatchObject({
      status: 422,
      code: 'PROGRAM_NOT_FOUND',
    });
    expect(studentRepository.create).not.toHaveBeenCalled();
  });

  it('create inserta y devuelve el estudiante ya con nombre y programa', async () => {
    programRepository.existsById.mockResolvedValue(true);
    studentRepository.create.mockResolvedValue(12);
    studentRepository.findById.mockResolvedValue(row);

    const created = await studentService.create({ programId: 1 });

    expect(studentRepository.create).toHaveBeenCalledTimes(1);
    expect(created.nombre).toBe('Laura Gómez');
  });

  it('update responde STUDENT_NOT_FOUND antes de tocar el programa', async () => {
    studentRepository.existsById.mockResolvedValue(false);
    await expect(studentService.update(5, { programId: 99 })).rejects.toMatchObject({
      code: 'STUDENT_NOT_FOUND',
    });
    expect(programRepository.existsById).not.toHaveBeenCalled();
  });

  it('list calcula offset y paginación a partir de pageNumber/pageSize', async () => {
    studentRepository.findAll.mockResolvedValue({ rows: [row], totalItems: 25 });

    const result = await studentService.list({
      pageNumber: 3,
      pageSize: 10,
      sortBy: 'lastName',
      sortDirection: 'asc',
      status: 'active',
    });

    expect(studentRepository.findAll).toHaveBeenCalledWith({
      filters: { status: 'active' },
      sortBy: 'lastName',
      sortDirection: 'asc',
      limit: 10,
      offset: 20,
    });
    expect(result.pagination).toEqual({
      pageNumber: 3,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    expect(result.data).toHaveLength(1);
  });

  it('remove lanza STUDENT_NOT_FOUND si no se eliminó ninguna fila', async () => {
    studentRepository.remove.mockResolvedValue(false);
    await expect(studentService.remove(5)).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });
});
