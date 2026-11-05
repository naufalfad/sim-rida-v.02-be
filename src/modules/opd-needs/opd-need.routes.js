const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');
const {
  createOpdNeed,
  getOpdNeeds,
  getOpdNeedById,
  reviewOpdNeed,
  fastTrackAssign,
  convertToAgenda,
  getCompletedProposalsForFastTrack,
  updateOpdNeed
} = require('./opd-need.controller');

// 1. Pengajuan Usulan Kebutuhan Riset Daerah oleh OPD (Form 4.0.1)
router.post(
  '/',
  authenticate,
  authorizeRoles('OPD', 'SUPERADMIN', 'KEPALA_BRIDA', 'STAF_BRIDA'),
  upload.single('supportDocFile'),
  createOpdNeed
);

// 2. Daftar Usulan Kebutuhan Riset Daerah (dengan filter & search)
router.get('/', authenticate, getOpdNeeds);

// 3. Helper: Bank Data Naskah Akademik & Policy Brief Terdahulu untuk Fast-Track
router.get(
  '/completed-proposals',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'REVIEWER_BRIDA', 'SUPERADMIN'),
  getCompletedProposalsForFastTrack
);

// 4. Detail Usulan Kebutuhan Riset dengan Pelacakan Status Berjenjang
router.get('/:id', authenticate, getOpdNeedById);

// 5. Lembar Kurasi, Uji Ilmiah, & Konsolidasi Multi-OPD (Form 4.0.2)
router.post(
  '/:id/review',
  authenticate,
  authorizeRoles('STAF_BRIDA', 'REVIEWER_BRIDA', 'KEPALA_BRIDA', 'SUPERADMIN'),
  reviewOpdNeed
);

// 6. Jalur Cepat: Disposisi Fast-Track Naskah Akademik Terdahulu ke OPD (Form 4.0.4)
router.post(
  '/:id/fast-track-assign',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'SUPERADMIN'),
  fastTrackAssign
);

// 7. Transformasi & Penerbitan Agenda Riset Baru / Call for Proposals (Form 4.0.3)
router.post(
  '/:id/convert-to-agenda',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA', 'SUPERADMIN'),
  convertToAgenda
);

// 8. Perbaikan / Revisi Usulan Kebutuhan oleh OPD (Form 4.0.1 - Resubmit)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('OPD', 'SUPERADMIN'),
  upload.single('supportDocFile'),
  updateOpdNeed
);

module.exports = router;

