const express = require('express');
const {
  createProposal,
  listProposals,
  getProposalById,
  gate1AdminCheck,
  gate2OpdReview,
  gate3HeadDecision,
  issueKakAndContract,
  uploadSignedContract,
  submitResults,
  forwardToOpd,
  submitOpdResponse,
  listDispositions,
  listContracts
} = require('./proposal.controller');
const { authenticate, authorizeRoles } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

// 1. Pengajuan Usulan (Peneliti)
router.post(
  '/',
  authenticate,
  authorizeRoles('PENELITI'),
  upload.fields([
    { name: 'proposalFile', maxCount: 1 },
    { name: 'coverLetterFile', maxCount: 1 },
    { name: 'rabFile', maxCount: 1 },
    { name: 'integrityPactFile', maxCount: 1 }
  ]),
  createProposal
);

// 2. Daftar Usulan, Disposisi & Kontrak
router.get('/', authenticate, listProposals);
router.get('/dispositions-list', authenticate, listDispositions);
router.get('/contracts-list', authenticate, listContracts);
router.get('/:id', authenticate, getProposalById);

// 3. Gerbang 1: Verifikasi Awal & Anti-Duplikasi (Staf BRIDA)
router.post(
  '/:id/gate1-admin-check',
  authenticate,
  authorizeRoles('STAF_BRIDA'),
  gate1AdminCheck
);

// 4. Gerbang 2: Uji Relevansi Kebutuhan OPD (Reviewer BRIDA)
router.post(
  '/:id/gate2-opd-review',
  authenticate,
  authorizeRoles('REVIEWER_BRIDA'),
  gate2OpdReview
);

// 5. Gerbang 3: Keputusan Mutlak Kepala BRIDA (Kepala BRIDA)
router.post(
  '/:id/gate3-head-decision',
  authenticate,
  authorizeRoles('KEPALA_BRIDA'),
  gate3HeadDecision
);

// 6. Penerbitan KAK, RKA & Draf Kontrak (Kepala BRIDA / Staf BRIDA)
router.post(
  '/:id/issue-contract',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA'),
  upload.fields([
    { name: 'kakFile', maxCount: 1 },
    { name: 'rkaFile', maxCount: 1 },
    { name: 'draftContractFile', maxCount: 1 }
  ]),
  issueKakAndContract
);

// 7. Peneliti Upload Ulang Kontrak Bertandatangan & Surat Kesanggupan (Role: PENELITI)
router.post(
  '/:id/upload-signed-contract',
  authenticate,
  authorizeRoles('PENELITI'),
  upload.fields([
    { name: 'signedContractFile', maxCount: 1 },
    { name: 'statementLetterFile', maxCount: 1 }
  ]),
  uploadSignedContract
);

// 8. Peneliti Upload Hasil Kajian & Rekomendasi (Peneliti)
router.post(
  '/:id/submit-results',
  authenticate,
  authorizeRoles('PENELITI'),
  upload.fields([
    { name: 'finalReportFile', maxCount: 1 },
    { name: 'academicPaperFile', maxCount: 1 },
    { name: 'policyBriefFile', maxCount: 1 }
  ]),
  submitResults
);

// 9. Forward / Disposisi ke OPD (Kepala BRIDA / Staf BRIDA)
router.post(
  '/:id/forward-opd',
  authenticate,
  authorizeRoles('KEPALA_BRIDA', 'STAF_BRIDA'),
  forwardToOpd
);

// 10. OPD Upload Bukti Dokumen Tindak Lanjut (OPD)
router.post(
  '/:id/opd-response',
  authenticate,
  authorizeRoles('OPD'),
  upload.single('proofFile'),
  submitOpdResponse
);

module.exports = router;
