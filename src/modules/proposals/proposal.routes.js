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
  reviewResearchResults,
  forwardToOpd,
  submitOpdResponse,
  listDispositions,
  listContracts,
  getAgendaCompetitiveRanking,
  runGate1AIAnalysis,
  getAiGate2AgendaBatch,
  getAiGate2Initiative,
  getReturnedProposalsSummary
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
router.get('/returned-summary', authenticate, getReturnedProposalsSummary);
router.get('/dispositions-list', authenticate, listDispositions);
router.get('/contracts-list', authenticate, listContracts);
router.get('/agenda-ranking/:agendaId', authenticate, getAgendaCompetitiveRanking);
router.get('/:id', authenticate, getProposalById);

// 3. Gerbang 1: Verifikasi Awal & Anti-Duplikasi (Staf BRIDA)
router.post(
  '/:id/gate1-admin-check',
  authenticate,
  authorizeRoles('STAF_BRIDA'),
  gate1AdminCheck
);

// 3.1 Asisten AI Copilot Gerbang 1 (Staf BRIDA & Kepala BRIDA)
router.post(
  '/:id/ai-gate1-analyze',
  authenticate,
  authorizeRoles('STAF_BRIDA', 'KEPALA_BRIDA'),
  runGate1AIAnalysis
);

// 4. Gerbang 2: Uji Relevansi Kebutuhan OPD (Reviewer BRIDA)
router.post(
  '/:id/gate2-opd-review',
  authenticate,
  authorizeRoles('REVIEWER_BRIDA'),
  gate2OpdReview
);

// 4.1 Asisten AI Gerbang 2: Seleksi Kompetitif Batch Per-Agenda
router.post(
  '/agenda/:agendaId/ai-gate2-batch',
  authenticate,
  authorizeRoles('REVIEWER_BRIDA'),
  getAiGate2AgendaBatch
);

// 4.2 Asisten AI Gerbang 2: Evaluasi Substantif Usulan Inisiatif Mandiri
router.post(
  '/:id/ai-gate2-initiative',
  authenticate,
  authorizeRoles('REVIEWER_BRIDA'),
  getAiGate2Initiative
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

// 8. Peneliti Upload Hasil Kajian & Rekomendasi (Peneliti / Staf BRIDA)
router.post(
  '/:id/submit-results',
  authenticate,
  authorizeRoles('PENELITI', 'STAF_BRIDA', 'SUPERADMIN'),
  upload.fields([
    { name: 'finalReportFile', maxCount: 1 },
    { name: 'academicPaperFile', maxCount: 1 },
    { name: 'policyBriefFile', maxCount: 1 }
  ]),
  submitResults
);

// 8.1 Uji Kelayakan Mutu & Pengesahan Naskah Akademik (Khusus Kepala BRIDA - Pencairan Kas Riil 100%)
router.post(
  '/:id/review-results',
  authenticate,
  authorizeRoles('KEPALA_BRIDA'),
  reviewResearchResults
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
