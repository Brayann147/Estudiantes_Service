const { Router } = require('express');
const controller = require('../controllers/student.controller');
const validate = require('../middlewares/validate');
const { photoUpload } = require('../middlewares/photoUpload');
const v = require('../validators/student.validator');
const contactRoutes = require('./contact.routes');
const { studentDocumentsRouter } = require('./document.routes');

const router = Router();

router.get('/', validate({ query: v.listStudentsQuery }), controller.list);
router.post('/', validate({ body: v.createStudentBody }), controller.create);

router.get('/:id', validate({ params: v.studentIdParams }), controller.getById);
router.put(
  '/:id',
  validate({ params: v.studentIdParams, body: v.replaceStudentBody }),
  controller.update,
);
router.patch(
  '/:id',
  validate({ params: v.studentIdParams, body: v.patchStudentBody }),
  controller.update,
);
router.delete('/:id', validate({ params: v.studentIdParams }), controller.remove);

// Fotografía (multipart/form-data, campo "file"): JPG o PNG, máximo 2 MB. PUT sube o reemplaza.
router.put(
  '/:id/foto',
  validate({ params: v.studentIdParams }),
  photoUpload,
  controller.uploadPhoto,
);
router.get('/:id/foto', validate({ params: v.studentIdParams }), controller.getPhotoUrl);
router.delete('/:id/foto', validate({ params: v.studentIdParams }), controller.deletePhoto);

// Recursos anidados: /api/estudiantes/:studentId/contacto y /documentos
router.use('/:studentId/contacto', contactRoutes);
router.use('/:studentId/documentos', studentDocumentsRouter);

module.exports = router;
