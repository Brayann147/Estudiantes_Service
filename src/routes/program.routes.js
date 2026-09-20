const { Router } = require('express');
const controller = require('../controllers/program.controller');
const validate = require('../middlewares/validate');
const v = require('../validators/program.validator');

const router = Router();

router.get('/', validate({ query: v.listProgramsQuery }), controller.list);
router.post('/', validate({ body: v.createProgramBody }), controller.create);
router.get('/:id', validate({ params: v.programIdParams }), controller.getById);
router.put(
  '/:id',
  validate({ params: v.programIdParams, body: v.replaceProgramBody }),
  controller.update,
);
router.patch(
  '/:id',
  validate({ params: v.programIdParams, body: v.patchProgramBody }),
  controller.update,
);
router.delete('/:id', validate({ params: v.programIdParams }), controller.remove);

module.exports = router;
