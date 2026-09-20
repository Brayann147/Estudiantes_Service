const { Router } = require('express');
const controller = require('../controllers/contact.controller');
const validate = require('../middlewares/validate');
const { studentIdNestedParams } = require('../validators/student.validator');
const { contactBody, patchContactBody } = require('../validators/contact.validator');

// mergeParams: hereda :studentId del router padre (/api/estudiantes/:studentId/contacto)
const router = Router({ mergeParams: true });
const params = { params: studentIdNestedParams };

router.get('/', validate(params), controller.get);
router.post('/', validate({ ...params, body: contactBody }), controller.create);
router.put('/', validate({ ...params, body: contactBody }), controller.replace);
router.patch('/', validate({ ...params, body: patchContactBody }), controller.patch);
router.delete('/', validate(params), controller.remove);

module.exports = router;
