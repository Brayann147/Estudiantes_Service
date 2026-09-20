const { Router } = require('express');
const controller = require('../controllers/document.controller');
const validate = require('../middlewares/validate');
const { studentIdNestedParams } = require('../validators/student.validator');
const v = require('../validators/document.validator');

// /api/estudiantes/:studentId/documentos  (listar y crear dentro de un estudiante)
const studentDocumentsRouter = Router({ mergeParams: true });
studentDocumentsRouter.get(
  '/',
  validate({ params: studentIdNestedParams }),
  controller.listByStudent,
);
studentDocumentsRouter.post(
  '/',
  validate({ params: studentIdNestedParams, body: v.createDocumentBody }),
  controller.create,
);

// /api/documentos/:id  (operaciones sobre un documento concreto)
const documentsRouter = Router();
documentsRouter.get('/:id', validate({ params: v.documentIdParams }), controller.getById);
documentsRouter.put(
  '/:id',
  validate({ params: v.documentIdParams, body: v.replaceDocumentBody }),
  controller.replace,
);
documentsRouter.patch(
  '/:id',
  validate({ params: v.documentIdParams, body: v.patchDocumentBody }),
  controller.patch,
);
documentsRouter.delete('/:id', validate({ params: v.documentIdParams }), controller.remove);

module.exports = { studentDocumentsRouter, documentsRouter };
