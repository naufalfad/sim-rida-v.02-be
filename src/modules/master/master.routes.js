const express = require('express');
const {
  getResearchFields,
  createResearchField,
  getRpjmdPriorities,
  getRegionalOpds,
  getPolicyInstruments,
  createPolicyInstrument,
  getDpaAccounts,
  createDpaAccount,
  toggleMasterStatus,
  getAllMasterSummary
} = require('./master.controller');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// 1. Master Bidang Kajian
router.get('/research-fields', getResearchFields);
router.post(
  '/research-fields',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'),
  createResearchField
);

// 2. Master Prioritas RPJMD
router.get('/rpjmd-priorities', getRpjmdPriorities);

// 3. Master OPD Lintas Sektor
router.get('/regional-opds', getRegionalOpds);

// 4. Master Instrumen Regulasi & Kebijakan
router.get('/policy-instruments', getPolicyInstruments);
router.post(
  '/policy-instruments',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'),
  createPolicyInstrument
);

// 5. Master Sub-Kegiatan & Rekening DPA BRIDA
router.get('/dpa-accounts', getDpaAccounts);
router.post(
  '/dpa-accounts',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'),
  createDpaAccount
);

// 6. Ringkasan Keseluruhan Master Data (Admin Dashboard)
router.get(
  '/overview',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'REVIEWER_BRIDA', 'SUPERADMIN'),
  getAllMasterSummary
);

// 7. Toggle Status Aktif/Non-Aktif Master Data
router.patch(
  '/:type/:id/toggle-status',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'),
  toggleMasterStatus
);

module.exports = router;

