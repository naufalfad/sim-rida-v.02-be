const express = require('express');
const {
  listAgendas,
  getAgendaById,
  checkFiscalQuota,
  createAgenda,
  updateAgenda,
  deleteAgenda,
  closeAndReleaseAgenda
} = require('./agenda.controller');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', listAgendas);
router.get('/fiscal-check', authenticate, checkFiscalQuota);
router.get('/:id', getAgendaById);
router.post('/', authenticate, authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'), createAgenda);
router.post('/:id/close-and-release', authenticate, authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'), closeAndReleaseAgenda);
router.put('/:id', authenticate, authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'), updateAgenda);
router.delete('/:id', authenticate, authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'), deleteAgenda);

module.exports = router;
