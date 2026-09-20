const { Router } = require('express');
const controller = require('../controllers/student.controller');
const validate = require('../middlewares/validate');
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

// Recursos anidados: /api/estudiantes/:studentId/contacto y /documentos
router.use('/:studentId/contacto', contactRoutes);
router.use('/:studentId/documentos', studentDocumentsRouter);

module.exports = router;
