jest.mock('../../src/repositories/student.repository');
jest.mock('../../src/repositories/program.repository');
jest.mock('../../src/storage/photoStorage');

const studentRepository = require('../../src/repositories/student.repository');
const programRepository = require('../../src/repositories/program.repository');
const photoStorage = require('../../src/storage/photoStorage');
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
    studentRepository.remove.mockResolvedValue({ deleted: false, photoKey: null });
    await expect(studentService.remove(5)).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });

  it('remove borra también la foto del almacenamiento', async () => {
    studentRepository.remove.mockResolvedValue({ deleted: true, photoKey: 'estudiantes/5/a.png' });
    await studentService.remove(5);
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith('estudiantes/5/a.png');
  });
});

describe('student.service - fotografía', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const file = { buffer: png, originalname: 'laura.png' };

  it('si guardar los metadatos falla, borra el objeto recién subido (sin huérfanos en el bucket)', async () => {
    studentRepository.existsById.mockResolvedValue(true);
    studentRepository.setPhoto.mockRejectedValue(new Error('BD caída'));

    await expect(studentService.uploadPhoto(12, file)).rejects.toThrow('BD caída');

    const uploadedKey = photoStorage.putPhoto.mock.calls[0][0];
    expect(uploadedKey).toMatch(/^estudiantes\/12\/[0-9a-f-]+\.png$/);
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith(uploadedKey);
  });

  it('al reemplazar, borra el objeto de la foto anterior', async () => {
    studentRepository.existsById.mockResolvedValue(true);
    studentRepository.setPhoto.mockResolvedValue('estudiantes/12/vieja.jpg');
    studentRepository.findById.mockResolvedValue({ ...row, photoKey: 'estudiantes/12/nueva.png' });
    photoStorage.signedPhotoUrl.mockResolvedValue('https://firmada');

    const result = await studentService.uploadPhoto(12, file);

    expect(photoStorage.deletePhoto).toHaveBeenCalledWith('estudiantes/12/vieja.jpg');
    expect(result.fotoUrl).toBe('https://firmada');
  });

  it('si S3 no está disponible responde STORAGE_UNAVAILABLE y no toca la base', async () => {
    studentRepository.existsById.mockResolvedValue(true);
    photoStorage.putPhoto.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(studentService.uploadPhoto(12, file)).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
    });
    expect(studentRepository.setPhoto).not.toHaveBeenCalled();
  });
});
