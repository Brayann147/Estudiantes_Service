const { Router } = require('express');
const { health } = require('../controllers/health.controller');
const studentRoutes = require('./student.routes');
const programRoutes = require('./program.routes');
const { documentsRouter } = require('./document.routes');

const router = Router();

router.get('/health', health);
router.use('/api/estudiantes', studentRoutes);
router.use('/api/programas', programRoutes);
router.use('/api/documentos', documentsRouter);

module.exports = router;
