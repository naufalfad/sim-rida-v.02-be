const express = require('express');
const { listAgendas, createAgenda } = require('./agenda.controller');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', listAgendas);
router.post('/', authenticate, authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA'), createAgenda);

module.exports = router;
