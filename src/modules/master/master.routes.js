const express = require('express');
const {
  getResearchFields,
  createResearchField,
  getRpjmdPriorities,
  getRegionalOpds
} = require('./master.controller');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// GET /api/master/research-fields (Bisa diakses publik atau user terautentikasi untuk dropdown)
router.get('/research-fields', getResearchFields);

// GET /api/master/rpjmd-priorities (Daftar Isu Makro RPJMD)
router.get('/rpjmd-priorities', getRpjmdPriorities);

// GET /api/master/regional-opds (Daftar Seluruh OPD Lintas Sektor Daerah)
router.get('/regional-opds', getRegionalOpds);

// POST /api/master/research-fields (Khusus pimpinan BRIDA)
router.post(
  '/research-fields',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA'),
  createResearchField
);

module.exports = router;

