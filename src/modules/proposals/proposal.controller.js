const path = require('path');
const prisma = require('../../prisma');
const { calculateWorkingDaysDeadline, getRemainingWorkingDays } = require('../../utils/sla');
const {
  analyzeGate1WithAI,
  analyzeGate2AgendaBatchWithAI,
  analyzeGate2InitiativeWithAI
} = require('./proposal.ai');
const {
  createNotification,
  notifyRole,
  notifyOpdUsers
} = require('../notifications/notification.service');

// Helper penomoran otomatis usulan: PROP-YYYY-0001
const generateProposalNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.researchProposal.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `PROP-${year}-${nextNum}`;
};

// =========================================================================
// 1. PENGAJUAN USULAN OLEH PENELITI (SLA 14 Hari Kerja Dimulai)
// =========================================================================
const createProposal = async (req, res) => {
  try {
    const {
      title,
      focusArea,
      background,
      methodology,
      targetLocation,
      estimatedDurationMonths,
      proposedBudget,
      agendaId
    } = req.body;

    if (!title || !focusArea || !background || !methodology || !targetLocation || !proposedBudget) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi semua isian wajib formulir usulan kajian.'
      });
    }

    if (!req.files || !req.files.proposalFile || req.files.proposalFile.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dokumen proposal teknis lengkap (PDF) wajib diunggah.'
      });
    }

    const proposalFile = req.files.proposalFile[0];
    const proposalFileUrl = `/uploads/proposals/${proposalFile.filename}`;

    let coverLetterUrl = null;
    if (req.files.coverLetterFile && req.files.coverLetterFile.length > 0) {
      coverLetterUrl = `/uploads/proposals/${req.files.coverLetterFile[0].filename}`;
    }

    let rabFileUrl = null;
    if (req.files.rabFile && req.files.rabFile.length > 0) {
      rabFileUrl = `/uploads/proposals/${req.files.rabFile[0].filename}`;
    }

    let integrityPactUrl = null;
    if (req.files.integrityPactFile && req.files.integrityPactFile.length > 0) {
      integrityPactUrl = `/uploads/proposals/${req.files.integrityPactFile[0].filename}`;
    }

    const proposalNumber = await generateProposalNumber();
    
    // SLA Tenggat Waktu: 14 hari kerja sejak disubmit
    const now = new Date();
    const slaDeadline = calculateWorkingDaysDeadline(now, 14);

    const newProposal = await prisma.researchProposal.create({
      data: {
        proposalNumber,
        title: title.trim(),
        focusArea: focusArea.trim(),
        background: background.trim(),
        methodology: methodology.trim(),
        targetLocation: targetLocation.trim(),
        estimatedDurationMonths: parseInt(estimatedDurationMonths) || 3,
        proposedBudget: parseFloat(proposedBudget),
        proposalFileUrl,
        coverLetterUrl,
        rabFileUrl,
        integrityPactUrl,
        agendaId: agendaId || null,
        submissionType: agendaId ? 'AGENDA_COMPETITIVE' : (req.body.submissionType === 'AGENDA_COMPETITIVE' ? 'AGENDA_COMPETITIVE' : 'INITIATIVE'),
        researcherId: req.user.id,
        status: 'SUBMITTED',
        submittedAt: now,
        slaDeadline
      },
      include: {
        researcher: {
          select: { name: true, email: true, institutionName: true, phone: true }
        },
        agenda: {
          select: { title: true, field: true, year: true }
        }
      }
    });

    // Catat ke Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: newProposal.id,
        action: 'PROPOSAL_SUBMITTED',
        details: `Peneliti ${req.user.name} mengajukan usulan riset: "${newProposal.title}". SLA 14 hari kerja dimulai.`
      }
    });

    // Notifikasi ke Staf BRIDA (Verifikasi Gerbang 1)
    notifyRole('STAF_BRIDA', {
      title: 'Pengajuan Riset Baru Masuk',
      message: `Usulan baru "${newProposal.title}" (${newProposal.proposalNumber}) menunggu verifikasi administrasi Gerbang 1.`,
      type: 'ACTION_REQUIRED',
      link: `/proposals/${newProposal.id}`
    }).catch(e => console.error('Notify Staf BRIDA error:', e));

    return res.status(201).json({
      success: true,
      message: 'Usulan kajian ilmiah berhasil diajukan. BRIDA akan memproses selambatnya 14 hari kerja.',
      data: {
        ...newProposal,
        remainingWorkingDays: 14
      }
    });
  } catch (err) {
    console.error('Create proposal error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses pengajuan usulan kajian.'
    });
  }
};

// =========================================================================
// 2. DAFTAR USULAN (Terfilter Berdasarkan Role + SLA Countdown)
// =========================================================================
const listProposals = async (req, res) => {
  try {
    const { status, agendaId, type, submissionType, search, isReturned, includeReturned } = req.query;
    const filter = {};

    // Filter berdasarkan role akses
    if (req.user.role === 'PENELITI') {
      filter.researcherId = req.user.id;
    } else if (req.user.role === 'OPD') {
      filter.dispositions = {
        some: {
          opdUserId: req.user.id
        }
      };
    }

    // Filter status penolakan / pengembalian vs usulan aktif
    if (isReturned === 'true') {
      if (status) {
        filter.status = status;
      } else {
        filter.status = {
          in: ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD']
        };
      }
    } else if (includeReturned === 'true') {
      if (status) filter.status = status;
    } else {
      // Default antrean verifikasi kerja: usulan gugur TIDAK PERNAH ditampilkan
      if (status) {
        filter.status = status;
      } else {
        filter.status = {
          notIn: ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD']
        };
      }
    }

    if (agendaId) filter.agendaId = agendaId;

    // Filter tipe usulan: INITIATIVE vs AGENDA_COMPETITIVE
    const effectiveType = type || submissionType;
    if (effectiveType) {
      if (effectiveType === 'INITIATIVE' || effectiveType === 'INISIATIF') {
        filter.submissionType = 'INITIATIVE';
      } else if (effectiveType === 'AGENDA_COMPETITIVE' || effectiveType === 'AGENDA') {
        filter.submissionType = 'AGENDA_COMPETITIVE';
      }
    }

    if (search) {
      filter.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { proposalNumber: { contains: search, mode: 'insensitive' } },
        { focusArea: { contains: search, mode: 'insensitive' } }
      ];
    }

    const proposals = await prisma.researchProposal.findMany({
      where: filter,
      include: {
        researcher: {
          select: { id: true, name: true, institutionName: true, email: true }
        },
        agenda: {
          select: { id: true, title: true, year: true, field: true, allocatedBudgetCeiling: true }
        },
        adminCheckedBy: {
          select: { name: true, position: true }
        },
        opdReviewer: {
          select: { name: true, position: true }
        },
        headApprovedBy: {
          select: { name: true, position: true }
        },
        kakDocument: {
          select: { id: true, kakNumber: true, allocatedBudget: true }
        },
        contractDocument: {
          select: { id: true, contractNumber: true, isSigned: true, signedUploadedAt: true }
        },
        researchResult: {
          select: { id: true, finalTitle: true, submittedAt: true, finalReportFileUrl: true }
        },
        _count: {
          select: { policyRecommendations: true, dispositions: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Tambahkan info hitung mundur SLA hari kerja hanya saat tahap penelaahan berkas BRIDA (Gerbang 1-3)
    const enrichedProposals = proposals.map((p) => {
      const isUnderReviewSla = ['SUBMITTED', 'ADMIN_PASSED', 'REVIEW_PASSED'].includes(p.status);
      return {
        ...p,
        remainingWorkingDays: isUnderReviewSla ? getRemainingWorkingDays(p.slaDeadline) : undefined
      };
    });

    return res.json({
      success: true,
      data: enrichedProposals
    });
  } catch (err) {
    console.error('List proposals error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar usulan kajian.'
    });
  }
};

// =========================================================================
// 3. DETAIL USULAN LENGKAP (3 Gerbang + Dokumen)
// =========================================================================
const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: {
        researcher: {
          select: {
            id: true,
            name: true,
            email: true,
            institutionName: true,
            nidnOrNip: true,
            phone: true,
            position: true,
            department: true
          }
        },
        agenda: true,
        adminCheckedBy: {
          select: { name: true, position: true, email: true }
        },
        opdReviewer: {
          select: { name: true, position: true, email: true }
        },
        headApprovedBy: {
          select: { name: true, position: true, email: true }
        },
        kakDocument: {
          include: {
            signer: { select: { name: true, position: true } }
          }
        },
        contractDocument: true,
        researchResult: true,
        policyRecommendations: {
          include: {
            opdResponses: {
              include: {
                opdUser: { select: { name: true, institutionName: true } }
              }
            }
          }
        },
        dispositions: {
          include: {
            opdUser: { select: { id: true, name: true, institutionName: true } }
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kajian tidak ditemukan.'
      });
    }

    // Role Guard: Peneliti hanya boleh melihat miliknya
    if (req.user.role === 'PENELITI' && proposal.researcherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak berhak mengakses berkas usulan peneliti lain.'
      });
    }

    const isUnderReviewSla = ['SUBMITTED', 'ADMIN_PASSED', 'REVIEW_PASSED'].includes(proposal.status);

    // Normalisasi skor AI Gerbang 2 agar sinkron dengan formula pasti Blueprint Bab 4.3
    if (proposal && proposal.aiGate2Analysis && typeof proposal.aiGate2Analysis === 'object') {
      const ai = proposal.aiGate2Analysis;
      if (ai.scoreScientificQuality !== undefined && ai.scoreOpdRelevance !== undefined) {
        const k1 = Number(ai.scoreScientificQuality) || 0;
        const k2 = Number(ai.scoreOpdRelevance) || 0;
        const k3 = Number(ai.scorePolicyApplicability) || 0;
        const k4 = Number(ai.scoreBudgetFeasibility) || 0;
        ai.weightedScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
      }
    }

    return res.json({
      success: true,
      data: {
        ...proposal,
        remainingWorkingDays: isUnderReviewSla ? getRemainingWorkingDays(proposal.slaDeadline) : undefined
      }
    });
  } catch (err) {
    console.error('Get proposal detail error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil rincian usulan kajian.'
    });
  }
};

// =========================================================================
// 4. GERBANG 1: VERIFIKASI AWAL & ANTI-DUPLIKASI (Role: STAF_BRIDA)
// =========================================================================
const gate1AdminCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      checkSuratPengantar,
      checkSusunanTim,
      checkKesesuaianRab,
      checkPaktaIntegritas,
      isDuplicateCheck,
      adminDuplicateStatus,
      previousResearchRef,
      rpjmdThematicTag,
      crossCuttingOpdTags,
      adminDuplicateNotes,
      assignedReviewerId,
      decision
    } = req.body;

    const proposal = await prisma.researchProposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ success: false, message: 'Usulan tidak ditemukan.' });

    if (proposal.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: `Usulan tidak dapat diproses di Gerbang 1 karena berstatus [${proposal.status}].`
      });
    }

    if (!adminDuplicateNotes || adminDuplicateNotes.trim().length < 30) {
      return res.status(400).json({
        success: false,
        message: 'Catatan telaah staf administrasi BRIDA wajib diisi minimal 30 karakter.'
      });
    }

    const isPassed = decision === 'PASSED' || (decision === undefined && Boolean(isDuplicateCheck));

    if (isPassed) {
      // Validasi 4 checklist dokumen wajib untuk kelulusan
      if (!checkSuratPengantar || !checkSusunanTim || !checkKesesuaianRab || !checkPaktaIntegritas) {
        return res.status(400).json({
          success: false,
          message: 'Seluruh 4 instrumen kelengkapan dokumen wajib (Surat Pengantar, Tim Peneliti, RAB SBM, dan Pakta Integritas) harus diverifikasi dan dicentang sah untuk meloloskan usulan.'
        });
      }

      if (!rpjmdThematicTag) {
        return res.status(400).json({
          success: false,
          message: 'Klaster Isu Makro RPJMD Daerah wajib dipilih untuk penyelarasan cross-cutting.'
        });
      }

      if (!assignedReviewerId) {
        return res.status(400).json({
          success: false,
          message: 'Akun Tim Reviewer Litbang BRIDA wajib ditugaskan untuk evaluasi Gerbang 2.'
        });
      }
    }

    // Format crossCuttingOpdTags jika array
    let opdTagsString = null;
    if (Array.isArray(crossCuttingOpdTags)) {
      opdTagsString = crossCuttingOpdTags.join(', ');
    } else if (typeof crossCuttingOpdTags === 'string') {
      opdTagsString = crossCuttingOpdTags.trim();
    }

    const duplicateStatus = adminDuplicateStatus || (isPassed ? 'UNIQUE' : 'DUPLICATE');
    const newStatus = isPassed
      ? 'ADMIN_PASSED'
      : (duplicateStatus === 'DUPLICATE' ? 'REJECTED_DUPLICATE' : 'REJECTED_ADMIN');

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: {
        status: newStatus,
        adminCheckedById: req.user.id,
        adminCheckSuratPengantar: Boolean(checkSuratPengantar),
        adminCheckSusunanTim: Boolean(checkSusunanTim),
        adminCheckKesesuaianRab: Boolean(checkKesesuaianRab),
        adminCheckPaktaIntegritas: Boolean(checkPaktaIntegritas),
        adminDuplicateStatus: duplicateStatus,
        adminDuplicateCheck: isPassed,
        adminPreviousResearchRef: previousResearchRef ? previousResearchRef.trim() : null,
        adminRpjmdThematicTag: rpjmdThematicTag ? rpjmdThematicTag.trim() : null,
        adminCrossCuttingOpdTags: opdTagsString,
        adminDuplicateNotes: adminDuplicateNotes.trim(),
        opdReviewerId: isPassed ? assignedReviewerId : null,
        adminCheckedAt: new Date()
      },
      include: {
        researcher: true,
        adminCheckedBy: true,
        opdReviewer: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: isPassed ? 'GATE1_PASSED' : 'GATE1_REJECTED',
        details: isPassed
          ? `Staf BRIDA (${req.user.name}) meloloskan administrasi Gerbang 1. Isu RPJMD: ${rpjmdThematicTag || '-'}. Reviewer: ${updated.opdReviewer?.name || '-'}.`
          : `Staf BRIDA (${req.user.name}) menolak usulan di Gerbang 1. Status: ${duplicateStatus}. Catatan: ${adminDuplicateNotes.substring(0, 100)}...`
      }
    });

    // Kirim notifikasi hasil Gerbang 1
    if (isPassed) {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Lolos Gerbang 1 (Administrasi)',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) dinyatakan lengkap & orisinil. Berkas diteruskan ke Tim Reviewer (Gerbang 2).`,
        type: 'SUCCESS',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 1 error:', e));

      if (updated.opdReviewerId) {
        createNotification({
          userId: updated.opdReviewerId,
          title: 'Tugas Telaah Substansi Gerbang 2',
          message: `Usulan "${updated.title}" (${updated.proposalNumber}) ditugaskan kepada Anda untuk telaah keselarasan Renja OPD.`,
          type: 'ACTION_REQUIRED',
          link: `/proposals/${updated.id}`
        }).catch(e => console.error('Notify reviewer error:', e));
      } else {
        notifyRole('REVIEWER_BRIDA', {
          title: 'Usulan Baru Menunggu Gerbang 2',
          message: `Usulan "${updated.title}" (${updated.proposalNumber}) lolos seleksi administrasi dan menunggu telaah keselarasan Renja OPD.`,
          type: 'ACTION_REQUIRED',
          link: `/proposals/${updated.id}`
        }).catch(e => console.error('Notify reviewers error:', e));
      }
    } else {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Ditolak pada Gerbang 1',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) ditolak pada Gerbang 1 (${duplicateStatus === 'DUPLICATE' ? 'Duplikasi' : 'Administrasi Tidak Sesuai'}). Catatan: ${adminDuplicateNotes.substring(0, 120)}...`,
        type: 'WARNING',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 1 reject error:', e));
    }

    return res.json({
      success: true,
      message: isPassed
        ? 'Gerbang 1 berhasil: Berkas lengkap & topik terverifikasi orisinil. Usulan resmi diteruskan ke Tim Reviewer.'
        : `Usulan ditolak pada Gerbang 1 (${duplicateStatus === 'DUPLICATE' ? 'Duplikasi Riset Terdahulu' : 'Gugur Administrasi'}).`,
      data: updated
    });
  } catch (err) {
    console.error('Gate 1 check error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses verifikasi Gerbang 1.' });
  }
};

// =========================================================================
// 4.1 ASISTEN AI COPILOT GERBANG 1 (Token-Efficient Semantic Screening)
// =========================================================================
const runGate1AIAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // jika ?force=true, abaikan cache dan eksekusi ulang

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: {
        researcher: { select: { name: true, institutionName: true } },
        agenda: { select: { title: true, field: true } }
      }
    });

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });
    }

    // Validasi: Usulan yang telah berstatus gugur/dikembalikan tidak dapat diproses
    const eliminatedStatuses = ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD'];
    if (eliminatedStatuses.includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: `Usulan tidak dapat diproses di Gerbang 1 karena telah berstatus [${proposal.status}] (gugur/dikembalikan ke peneliti).`
      });
    }

    // Jika sudah pernah dianalisis dan tidak minta force reload, kembalikan data cache (0 token)
    if (proposal.aiGate1Analysis && force !== 'true') {
      return res.json({
        success: true,
        cached: true,
        message: 'Hasil telaah AI Gerbang 1 dimuat dari cache database (0 token).',
        data: proposal.aiGate1Analysis,
        analyzedAt: proposal.aiGate1AnalyzedAt
      });
    }

    // Ambil referensi riset terdahulu HANYA yang berstatus COMPLETED (Arsip Riset Terdahulu Daerah)
    // PENTING: Jangan bandingkan dengan sesama proposal yang sedang bersaing di tahun berjalan!
    const priorResearches = await prisma.researchProposal.findMany({
      where: {
        id: { not: id },
        status: 'COMPLETED'
      },
      select: {
        proposalNumber: true,
        title: true,
        focusArea: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    // Ambil master data prioritas RPJMD dan OPD
    const [rpjmdList, opdList] = await Promise.all([
      prisma.masterRpjmd.findMany({ where: { isActive: true }, select: { name: true } }).catch(() => []),
      prisma.masterOpd.findMany({ where: { isActive: true }, select: { name: true, shortName: true } }).catch(() => [])
    ]);

    // Jalankan analisis dengan OpenAI
    const analysisResult = await analyzeGate1WithAI({
      proposal,
      priorResearches,
      rpjmdList,
      opdList
    });

    // Simpan ke database (caching)
    const updated = await prisma.researchProposal.update({
      where: { id },
      data: {
        aiGate1Analysis: analysisResult,
        aiGate1AnalyzedAt: new Date()
      }
    });

    return res.json({
      success: true,
      cached: false,
      message: 'Analisis Cerdas AI Gerbang 1 berhasil dijalankan.',
      data: analysisResult,
      analyzedAt: updated.aiGate1AnalyzedAt
    });
  } catch (err) {
    console.error('AI Gate 1 Analysis Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menjalankan analisis AI Gerbang 1.'
    });
  }
};

// =========================================================================
// 4.2 ASISTENSI AI GERBANG 2: SELEKSI KOMPETITIF BATCH PER-AGENDA
// =========================================================================
const getAiGate2AgendaBatch = async (req, res) => {
  try {
    const { agendaId } = req.params;
    const { force } = req.query;

    const agenda = await prisma.researchAgenda.findUnique({
      where: { id: agendaId }
    });

    if (!agenda) {
      return res.status(404).json({ success: false, message: 'Agenda Riset Daerah tidak ditemukan.' });
    }

    const proposals = await prisma.researchProposal.findMany({
      where: {
        agendaId,
        submissionType: 'AGENDA_COMPETITIVE',
        status: {
          in: [
            'ADMIN_PASSED',
            'REVIEW_PASSED',
            'APPROVED',
            'CONTRACT_ISSUED',
            'CONTRACT_SIGNED',
            'RESULTS_SUBMITTED',
            'FORWARDED_TO_OPD',
            'COMPLETED'
          ]
        }
      },
      include: {
        researcher: { select: { id: true, name: true, institutionName: true } }
      },
      orderBy: { submittedAt: 'asc' }
    });

    if (proposals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada usulan penelitian yang lolos verifikasi administrasi Gerbang 1 (ADMIN_PASSED) untuk agenda riset ini.'
      });
    }

    // Zero-token Caching: Jika proposal sudah dianalisis dan tidak dipaksa force=true, kembalikan dari cache
    const evaluatedProposals = proposals.filter((p) => p.aiGate2Analysis && typeof p.aiGate2Analysis === 'object');
    if (evaluatedProposals.length === proposals.length && force !== 'true') {
      const cachedEvaluations = evaluatedProposals
        .map((p) => {
          const ai = p.aiGate2Analysis;
          const k1 = Number(ai.scoreScientificQuality) || 0;
          const k2 = Number(ai.scoreOpdRelevance) || 0;
          const k3 = Number(ai.scorePolicyApplicability) || 0;
          const k4 = Number(ai.scoreBudgetFeasibility) || 0;
          const weightedScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
          return {
            ...ai,
            proposalId: p.id,
            proposalNumber: p.proposalNumber,
            weightedScore,
            meetsPassingGrade: weightedScore >= 70
          };
        })
        .sort((a, b) => b.weightedScore - a.weightedScore);

      cachedEvaluations.forEach((ev, idx) => {
        ev.rank = idx + 1;
        ev.isWinner = idx === 0;
      });

      return res.json({
        success: true,
        cached: true,
        message: 'Hasil telaah komparatif AI Gerbang 2 dimuat dari cache database (0 token).',
        data: {
          agendaId: agenda.id,
          totalCompetitors: proposals.length,
          winnerProposalNumber: cachedEvaluations[0]?.proposalNumber || null,
          evaluations: cachedEvaluations
        },
        rankings: cachedEvaluations
      });
    }

    // Ambil data kapasitas kas fiskal tahun anggaran terkait
    const fiscalBudget = await prisma.fiscalBudgetCap.findFirst({
      where: { fiscalYear: agenda.year }
    });

    // Jalankan analisis batch komparatif AI
    const batchResult = await analyzeGate2AgendaBatchWithAI({
      agenda,
      proposals,
      fiscalBudget
    });

    // Simpan hasil evaluasi masing-masing proposal ke database (Zero-Token Caching)
    const updatePromises = (batchResult.evaluations || []).map((ev) => {
      return prisma.researchProposal.update({
        where: { id: ev.proposalId },
        data: {
          aiGate2Analysis: ev,
          aiGate2AnalyzedAt: new Date()
        }
      }).catch((e) => console.error(`Failed to cache AI G2 for proposal ${ev.proposalId}:`, e));
    });

    await Promise.all(updatePromises);

    return res.json({
      success: true,
      message: `Seleksi kompetitif AI berhasil dijalankan untuk ${proposals.length} proposal pada agenda: "${agenda.title}".`,
      data: batchResult,
      rankings: batchResult.evaluations
    });
  } catch (err) {
    console.error('getAiGate2AgendaBatch error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menjalankan seleksi kompetitif AI Gerbang 2.'
    });
  }
};

// =========================================================================
// 4.3 ASISTENSI AI GERBANG 2: UJI KELAYAKAN INISIATIF MANDIRI PENELITI
// =========================================================================
const getAiGate2Initiative = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: {
        researcher: { select: { name: true, institutionName: true } }
      }
    });

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });
    }

    // Validasi Barrier Gerbang 2: Hanya usulan inisiatif yang lolos Gerbang 1 (ADMIN_PASSED) yang boleh dinilai
    const allowedGate2Statuses = ['ADMIN_PASSED', 'REVIEW_PASSED', 'APPROVED'];
    if (!allowedGate2Statuses.includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: `Usulan inisiatif tidak dapat dievaluasi di Gerbang 2 karena berstatus [${proposal.status}]. Hanya usulan yang telah lolos verifikasi administrasi Gerbang 1 (ADMIN_PASSED) yang dapat dievaluasi di Gerbang 2.`
      });
    }

    // Jika sudah dianalisis dan tidak force, kembalikan cache
    if (proposal.aiGate2Analysis && force !== 'true') {
      return res.json({
        success: true,
        cached: true,
        message: 'Hasil telaah AI Gerbang 2 dimuat dari cache database (0 token).',
        data: proposal.aiGate2Analysis,
        analyzedAt: proposal.aiGate2AnalyzedAt
      });
    }

    const year = proposal.submittedAt.getFullYear();
    const [fiscalBudget, policyInstruments] = await Promise.all([
      prisma.fiscalBudgetCap.findFirst({ where: { fiscalYear: year } }),
      prisma.masterPolicyInstrument.findMany({ where: { isActive: true }, select: { name: true } }).catch(() => [])
    ]);

    const result = await analyzeGate2InitiativeWithAI({
      proposal,
      fiscalBudget,
      policyInstruments
    });

    // Simpan ke database
    const updated = await prisma.researchProposal.update({
      where: { id },
      data: {
        aiGate2Analysis: result,
        aiGate2AnalyzedAt: new Date()
      }
    });

    return res.json({
      success: true,
      cached: false,
      message: 'Uji kelayakan substantif AI Gerbang 2 berhasil dijalankan.',
      data: result,
      analyzedAt: updated.aiGate2AnalyzedAt
    });
  } catch (err) {
    console.error('getAiGate2Initiative error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menjalankan telaah AI Gerbang 2.'
    });
  }
};

// =========================================================================
// 5. GERBANG 2: UJI KELAYAKAN SUBSTANSI & RELEVANSI RENJA OPD (Role: REVIEWER_BRIDA)
// Sesuai Dokumen Blueprint SIMRIDA Bab 4.3 (Rubrik 4 Parameter Berbobot)
// =========================================================================
const gate2OpdReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scoreScientificQuality,   // 1. Kualitas ilmiah, metodologi, teknik sampling, dan data (Bobot 25%)
      scoreOpdRelevance,        // 2. Keselarasan isu terhadap sasaran program Renja OPD & IKU (Bobot 35%)
      scorePolicyApplicability, // 3. Kemudahan diadopsi jadi Perda/Perbup/Kepbup/Renja (Bobot 25%)
      scoreBudgetFeasibility,   // 4. Kewajaran biaya RAB dan rasionalitas jadwal pengerjaan (Bobot 15%)
      targetOpdNames,           // 6. Daftar OPD definitif penerima rekomendasi kajian (Wajib)
      opdRelevanceNotes,        // 7. Catatan kritis penajaman ruang lingkup dan saran teknis (Wajib min 50 char)
      reviewerRecommendation,   // 8. RECOMMENDED (Skor >= 70) / NOT_RECOMMENDED (Tolak)
      // Dukungan fallback lama
      score,
      isRelevant,
      opdNotes
    } = req.body;

    const proposal = await prisma.researchProposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });

    // Validasi Barrier Gerbang 2: Hanya usulan yang lolos Gerbang 1 yang dapat dinilai di Gerbang 2
    if (proposal.status !== 'ADMIN_PASSED' && proposal.status !== 'REVIEW_PASSED') {
      return res.status(400).json({
        success: false,
        message: `Usulan tidak dapat dinilai di Gerbang 2 karena berstatus [${proposal.status}]. Hanya usulan yang lolos verifikasi administrasi Gerbang 1 (ADMIN_PASSED) yang dapat dievaluasi.`
      });
    }

    // Parse dan validasi 4 skor kriteria
    const k1 = parseFloat(scoreScientificQuality ?? score ?? 0);
    const k2 = parseFloat(scoreOpdRelevance ?? score ?? 0);
    const k3 = parseFloat(scorePolicyApplicability ?? score ?? 0);
    const k4 = parseFloat(scoreBudgetFeasibility ?? score ?? 0);

    if (isNaN(k1) || k1 < 1 || k1 > 100 ||
        isNaN(k2) || k2 < 1 || k2 > 100 ||
        isNaN(k3) || k3 < 1 || k3 > 100 ||
        isNaN(k4) || k4 < 1 || k4 > 100) {
      return res.status(400).json({
        success: false,
        message: 'Seluruh 4 indikator rubrik penilaian (Kualitas Ilmiah, Relevansi OPD, Aplikabilitas Kebijakan, dan Kelayakan Anggaran) wajib dinilai dengan skor rentang 1 - 100.'
      });
    }

    // 5. Kalkulasi Otomatis Total Skor Tertimbang
    // Formula Blueprint: (K1*0.25) + (K2*0.35) + (K3*0.25) + (K4*0.15)
    const totalCalculatedScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));

    // Validasi Rekomendasi
    let recommendation = reviewerRecommendation;
    if (!recommendation) {
      if (isRelevant !== undefined) {
        recommendation = isRelevant ? 'RECOMMENDED' : 'NOT_RECOMMENDED';
      } else {
        recommendation = totalCalculatedScore >= 70 ? 'RECOMMENDED' : 'NOT_RECOMMENDED';
      }
    }

    if (recommendation === 'RECOMMENDED' && totalCalculatedScore < 70) {
      return res.status(400).json({
        success: false,
        message: `Total skor tertimbang (${totalCalculatedScore}) berada di bawah ambang batas kelulusan passing grade minimal (70.00). Usulan tidak memenuhi syarat untuk direkomendasikan lolos.`
      });
    }

    // Validasi Target OPD Definitif
    let opdNamesString = '';
    if (Array.isArray(targetOpdNames)) {
      opdNamesString = targetOpdNames.join(', ');
    } else if (typeof targetOpdNames === 'string') {
      opdNamesString = targetOpdNames.trim();
    }

    if (!opdNamesString || opdNamesString.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Daftar OPD definitif penerima rekomendasi kajian wajib dipilih atau dicantumkan.'
      });
    }

    // Validasi Catatan Kritis Penajaman (Min. 50 Karakter sesuai Blueprint)
    const notes = (opdRelevanceNotes || opdNotes || '').trim();
    if (!notes || notes.length < 50) {
      return res.status(400).json({
        success: false,
        message: `Catatan kritis penajaman ruang lingkup dan saran teknis wajib diisi minimal 50 karakter (saat ini ${notes.length} karakter).`
      });
    }

    const isPassed = recommendation === 'RECOMMENDED' && totalCalculatedScore >= 70;
    const newStatus = isPassed ? 'REVIEW_PASSED' : 'REJECTED_OPD_MISMATCH';

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: {
        status: newStatus,
        opdReviewerId: req.user.id,
        scoreScientificQuality: k1,
        scoreOpdRelevance: k2,
        scorePolicyApplicability: k3,
        scoreBudgetFeasibility: k4,
        opdRelevanceScore: totalCalculatedScore,
        reviewerRecommendation: recommendation,
        targetOpdNames: opdNamesString,
        opdRelevanceNotes: notes,
        opdReviewedAt: new Date()
      },
      include: {
        researcher: true,
        adminCheckedBy: true,
        opdReviewer: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: isPassed ? 'GATE2_PASSED' : 'GATE2_REJECTED',
        details: isPassed
          ? `Reviewer Litbangda (${req.user.name}) meloloskan usulan di Gerbang 2 dengan Skor Tertimbang: ${totalCalculatedScore}/100 [Kualitas Ilmiah 25%: ${k1}, Relevansi Renja OPD 35%: ${k2}, Aplikabilitas Kebijakan 25%: ${k3}, Kelayakan RAB 15%: ${k4}]. Rekomendasi: LAYAK (RECOMMENDED). Target OPD: ${opdNamesString}.`
          : `Reviewer Litbangda (${req.user.name}) menetapkan usulan TIDAK LAYAK di Gerbang 2 dengan Skor Tertimbang: ${totalCalculatedScore}/100. Rekomendasi: NOT_RECOMMENDED. Catatan: ${notes.substring(0, 100)}...`
      }
    });

    // Kirim notifikasi hasil Gerbang 2
    if (isPassed) {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Lolos Gerbang 2 (Reviewer OPD)',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) dinyatakan LAYAK dengan skor ${totalCalculatedScore}/100 dan diteruskan ke Kepala BRIDA (Gerbang 3).`,
        type: 'SUCCESS',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 2 error:', e));

      notifyRole('KEPALA_BRIDA', {
        title: 'Usulan Menunggu Keputusan Gerbang 3',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) lolos telaah teknis (Skor: ${totalCalculatedScore}/100) dan menunggu keputusan akhir penetapan anggaran.`,
        type: 'ACTION_REQUIRED',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify Kepala BRIDA Gate 2 error:', e));
    } else {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Ditolak pada Gerbang 2',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) tidak direkomendasikan pada Gerbang 2 (Skor: ${totalCalculatedScore}/100). Catatan Reviewer: ${notes.substring(0, 120)}...`,
        type: 'WARNING',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 2 reject error:', e));
    }

    return res.json({
      success: true,
      message: isPassed
        ? `Gerbang 2 Berhasil: Usulan dinyatakan LAYAK dengan Skor Tertimbang ${totalCalculatedScore} (Passing Grade >= 70) dan resmi diajukan ke Kepala BRIDA.`
        : `Gerbang 2 Selesai: Usulan dinyatakan TIDAK DIREKOMENDASIKAN (Status: ${newStatus}).`,
      data: updated
    });
  } catch (err) {
    console.error('Gate 2 review error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses evaluasi Gerbang 2.' });
  }
};

// =========================================================================
// 6. GERBANG 3: KEPUTUSAN MUTLAK KEPALA BRIDA (Role: KEPALA_BRIDA)
// Sesuai Dokumen Blueprint SIMRIDA Bab 4.4 (Ketersediaan Anggaran & Kemanfaatan Daerah)
// =========================================================================
const gate3HeadDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      decision,               // 7. 'APPROVED' (Disetujui Mutlak) | 'REJECTED' (Ditolak Anggaran/Prioritas)
      headSubActivityDpa,     // 1. Nama Sub-Kegiatan DPA BRIDA pengampu riset (Wajib jika disetujui)
      headBudgetAccountCode,  // 2. Kode Rekening Anggaran Belanja Jasa Riset (Wajib jika disetujui)
      headBudgetFeasibility,  // 3. Konfirmasi ketersediaan kas pada DPA BRIDA berjalan (Wajib)
      headApprovedBudget,     // 4. Pagu anggaran definitif yang disetujui Kepala BRIDA (Rp) (Wajib jika disetujui)
      headStrategicBenefit,   // 5. Uraian kemanfaatan strategis hasil riset bagi daerah (Wajib, min 50 char)
      headDecisionNotes       // 6. Instruksi dan arahan tertulis pimpinan BRIDA (Wajib, min 30 char)
    } = req.body;

    if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
      return res.status(400).json({
        success: false,
        message: 'Status keputusan mutlak Kepala BRIDA (APPROVED / REJECTED) wajib dipilih.'
      });
    }

    const proposal = await prisma.researchProposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });

    // Validasi Barrier Gerbang 2: Hanya usulan yang lolos Gerbang 1 yang dapat dinilai di Gerbang 2
    if (proposal.status !== 'ADMIN_PASSED' && proposal.status !== 'REVIEW_PASSED') {
      return res.status(400).json({
        success: false,
        message: `Usulan tidak dapat dinilai di Gerbang 2 karena berstatus [${proposal.status}]. Hanya usulan yang lolos verifikasi administrasi Gerbang 1 (ADMIN_PASSED) yang dapat dievaluasi.`
      });
    }

    const isApproved = decision === 'APPROVED';

    // Validasi Field jika Disetujui (APPROVED)
    if (isApproved) {
      if (!headSubActivityDpa || headSubActivityDpa.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nama Sub-Kegiatan DPA BRIDA pengampu riset wajib diisi.'
        });
      }

      if (!headBudgetAccountCode || headBudgetAccountCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Kode Rekening Anggaran Belanja Jasa Riset wajib diisi.'
        });
      }

      if (!headBudgetFeasibility) {
        return res.status(400).json({
          success: false,
          message: 'Konfirmasi ketersediaan alokasi kas pada DPA BRIDA tahun anggaran berjalan wajib dicentang.'
        });
      }

      if (!headApprovedBudget || isNaN(parseFloat(headApprovedBudget)) || parseFloat(headApprovedBudget) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pagu anggaran definitif yang disetujui Kepala BRIDA wajib berupa nominal valid lebih dari Rp 0.'
        });
      }

      const parsedApproved = parseFloat(headApprovedBudget);

      // A. Fiscal Budget Guard: Validasi terhadap Sisa Pagu DPA Agenda (Dukungan Multi-Awardee)
      if (proposal.agendaId) {
        const agenda = await prisma.researchAgenda.findUnique({
          where: { id: proposal.agendaId },
          select: { title: true, allocatedBudgetCeiling: true }
        });
        const agendaCeiling = agenda?.allocatedBudgetCeiling || 0;
        if (agendaCeiling > 0) {
          const otherAgendaProposals = await prisma.researchProposal.findMany({
            where: {
              agendaId: proposal.agendaId,
              id: { not: id },
              status: {
                in: [
                  'APPROVED',
                  'CONTRACT_ISSUED',
                  'CONTRACT_SIGNED',
                  'RESULTS_SUBMITTED',
                  'RESULTS_REVISION',
                  'RESULTS_APPROVED',
                  'FORWARDED_TO_OPD',
                  'COMPLETED'
                ]
              }
            },
            select: { headApprovedBudget: true, proposedBudget: true, contractDocument: { select: { contractValue: true } } }
          });
          const existingCommittedInAgenda = otherAgendaProposals.reduce(
            (acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
            0
          );
          const remainingDpaInAgenda = Math.max(0, agendaCeiling - existingCommittedInAgenda);
          if (parsedApproved > remainingDpaInAgenda) {
            return res.status(400).json({
              success: false,
              message: `Persetujuan ditolak: Nominal pagu usulan (Rp ${parsedApproved.toLocaleString('id-ID')}) melebihi sisa pagu DPA Agenda "${agenda.title}". Sisa DPA yang tersedia saat ini: Rp ${remainingDpaInAgenda.toLocaleString('id-ID')} (dari Total Pagu DPA Agenda Rp ${agendaCeiling.toLocaleString('id-ID')}).`
            });
          }
        }
      }

      // B. Fiscal Budget Guard: Validasi terhadap Sisa Pagu Kas Induk Bebas Tahun Berjalan
      const proposalYear = proposal.submittedAt ? new Date(proposal.submittedAt).getFullYear() : new Date().getFullYear();
      const budgetCap = await prisma.fiscalBudgetCap.findUnique({
        where: { fiscalYear: proposalYear }
      });

      if (budgetCap) {
        const otherYearProposals = await prisma.researchProposal.findMany({
          where: {
            id: { not: id },
            submittedAt: {
              gte: new Date(`${proposalYear}-01-01`),
              lte: new Date(`${proposalYear}-12-31T23:59:59.999Z`)
            },
            status: {
              in: [
                'APPROVED',
                'CONTRACT_ISSUED',
                'CONTRACT_SIGNED',
                'RESULTS_SUBMITTED',
                'RESULTS_REVISION',
                'RESULTS_APPROVED',
                'FORWARDED_TO_OPD',
                'COMPLETED'
              ]
            }
          },
          select: { submissionType: true, headApprovedBudget: true, proposedBudget: true, contractDocument: { select: { contractValue: true } } }
        });

        let totalCommittedYear = 0;
        let schemeCommittedYear = 0;

        otherYearProposals.forEach((p) => {
          const val = p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0;
          totalCommittedYear += val;
          if (p.submissionType === proposal.submissionType) {
            schemeCommittedYear += val;
          }
        });

        const remainingTotalFiscal = Math.max(0, budgetCap.totalBudgetCap - totalCommittedYear);
        const schemeCap = proposal.submissionType === 'AGENDA_COMPETITIVE' ? budgetCap.agendaAllocation : budgetCap.initiativeAllocation;
        const remainingSchemeFiscal = Math.max(0, schemeCap - schemeCommittedYear);

        if (parsedApproved > remainingTotalFiscal) {
          return res.status(400).json({
            success: false,
            message: `Persetujuan ditolak: Nominal pagu usulan (Rp ${parsedApproved.toLocaleString('id-ID')}) melebihi total sisa pagu kas induk bebas TA ${proposalYear}. Sisa kas bebas yang tersedia saat ini: Rp ${remainingTotalFiscal.toLocaleString('id-ID')}.`
          });
        }

        if (parsedApproved > remainingSchemeFiscal) {
          const schemeName = proposal.submissionType === 'AGENDA_COMPETITIVE' ? 'Agenda Riset Daerah' : 'Inisiatif Mandiri Peneliti';
          return res.status(400).json({
            success: false,
            message: `Persetujuan ditolak: Nominal pagu usulan (Rp ${parsedApproved.toLocaleString('id-ID')}) melebihi sisa kuota kas untuk skema ${schemeName} TA ${proposalYear}. Sisa kuota skema tersedia: Rp ${remainingSchemeFiscal.toLocaleString('id-ID')}.`
          });
        }
      }
    }

    // Validasi Catatan Kemanfaatan Strategis (Min. 50 Karakter sesuai Blueprint)
    const strategicNotes = (headStrategicBenefit || '').trim();
    if (!strategicNotes || strategicNotes.length < 50) {
      return res.status(400).json({
        success: false,
        message: `Uraian kemanfaatan strategis hasil riset bagi daerah wajib diisi minimal 50 karakter (saat ini ${strategicNotes.length} karakter).`
      });
    }

    // Validasi Catatan Arahan Pimpinan (Min. 30 Karakter sesuai Blueprint)
    const decisionNotes = (headDecisionNotes || '').trim();
    if (!decisionNotes || decisionNotes.length < 30) {
      return res.status(400).json({
        success: false,
        message: `Instruksi dan arahan tertulis pimpinan BRIDA wajib diisi minimal 30 karakter (saat ini ${decisionNotes.length} karakter).`
      });
    }

    const newStatus = isApproved ? 'APPROVED' : 'REJECTED_BY_HEAD';
    const parsedBudget = isApproved ? parseFloat(headApprovedBudget) : null;

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: {
        status: newStatus,
        headApprovedById: req.user.id,
        headSubActivityDpa: isApproved ? headSubActivityDpa.trim() : null,
        headBudgetAccountCode: isApproved ? headBudgetAccountCode.trim() : null,
        headBudgetFeasibility: Boolean(headBudgetFeasibility),
        headApprovedBudget: parsedBudget,
        headStrategicBenefit: strategicNotes,
        headDecisionNotes: decisionNotes,
        headDecidedAt: new Date()
      },
      include: {
        researcher: true,
        adminCheckedBy: true,
        opdReviewer: true,
        headApprovedBy: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: isApproved ? 'HEAD_APPROVED' : 'HEAD_REJECTED',
        details: isApproved
          ? `Kepala BRIDA (${req.user.name}) menyetujui mutlak usulan riset. Pagu Definitif: Rp ${parsedBudget.toLocaleString('id-ID')}. Sub-Kegiatan DPA: ${headSubActivityDpa}. Rekening: ${headBudgetAccountCode}. SLA 14 Hari Tuntas.`
          : `Kepala BRIDA (${req.user.name}) menolak usulan riset pada Gerbang 3 karena pertimbangan anggaran/kemanfaatan. Catatan: ${decisionNotes.substring(0, 100)}...`
      }
    });

    // Kirim notifikasi hasil Gerbang 3
    if (isApproved) {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Disetujui Mutlak Kepala BRIDA!',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) disetujui Kepala BRIDA dengan Pagu Definitif Rp ${parsedBudget.toLocaleString('id-ID')}. Menunggu penerbitan KAK & Kontrak.`,
        type: 'SUCCESS',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 3 error:', e));

      notifyRole('STAF_BRIDA', {
        title: 'Usulan Siap Terbit Paket Perikatan',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) telah disetujui Kepala BRIDA dan siap diproses penerbitan KAK & PKS.`,
        type: 'INFO',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify Staf BRIDA Gate 3 error:', e));
    } else {
      createNotification({
        userId: updated.researcherId,
        title: 'Usulan Ditolak pada Gerbang 3',
        message: `Usulan "${updated.title}" (${updated.proposalNumber}) tidak disetujui oleh Kepala BRIDA. Catatan: ${decisionNotes.substring(0, 120)}...`,
        type: 'WARNING',
        link: `/proposals/${updated.id}`
      }).catch(e => console.error('Notify researcher Gate 3 reject error:', e));
    }

    return res.json({
      success: true,
      message: isApproved
        ? `Keputusan Mutlak KEPALA BRIDA: Usulan resmi DISETUJUI dengan Pagu Definitif Rp ${parsedBudget.toLocaleString('id-ID')}. Status kini APPROVED dan siap diterbitkan Dokumen KAK, RKA, serta Draf Kontrak.`
        : 'Keputusan Mutlak KEPALA BRIDA: Usulan resmi DITOLAK (REJECTED_BY_HEAD).',
      data: updated
    });
  } catch (err) {
    console.error('Gate 3 decision error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses keputusan Kepala BRIDA.' });
  }
};

// =========================================================================
// 7. PENERBITAN PAKET DOKUMEN PERIKATAN LEGAL HUKUM (Role: KEPALA_BRIDA / STAF_BRIDA)
// Sesuai Dokumen Blueprint SIMRIDA Bab 4.5 (Paket 3 Berkas Dokumen Resmi)
// =========================================================================
const issueKakAndContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kakNumber,        // 1. Nomor Register KAK resmi BRIDA (Wajib, Format Baku)
      rkaNumber,        // 3. Nomor DPA / RKA Dokumen Anggaran Riset (Wajib)
      contractNumber,   // 5. Nomor Perjanjian Kerjasama (PKS) BRIDA (Wajib, Format Baku)
      allocatedBudget,  // 7. Nilai kontrak perikatan hukum yang mengikat (Rp) (Wajib, > 0)
      title,
      background,
      objective,
      scope,
      deliverables
    } = req.body;

    if (!kakNumber || !contractNumber || !allocatedBudget) {
      return res.status(400).json({
        success: false,
        message: 'Nomor Register KAK, nomor Kontrak PKS, dan nilai kontrak definitif wajib diisi lengkap.'
      });
    }

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: { agenda: true }
    });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });
    }

    if (proposal.status !== 'APPROVED' && proposal.status !== 'CONTRACT_ISSUED') {
      return res.status(400).json({
        success: false,
        message: `Paket KAK dan Kontrak PKS hanya dapat diterbitkan untuk usulan yang telah disetujui Kepala BRIDA di Gerbang 3 (status: APPROVED). Status usulan saat ini: [${proposal.status}].`
      });
    }

    const targetVal = parseFloat(allocatedBudget);
    if (isNaN(targetVal) || targetVal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nilai kontrak perikatan wajib berupa nominal rupiah valid lebih dari 0.'
      });
    }

    // Fiscal Guard: Validasi terhadap Sisa Pagu DPA Agenda
    if (proposal.agendaId && proposal.agenda?.allocatedBudgetCeiling > 0) {
      const otherCommitted = await prisma.researchProposal.findMany({
        where: {
          agendaId: proposal.agendaId,
          id: { not: id },
          status: {
            in: [
              'APPROVED',
              'CONTRACT_ISSUED',
              'CONTRACT_SIGNED',
              'RESULTS_SUBMITTED',
              'RESULTS_REVISION',
              'RESULTS_APPROVED',
              'FORWARDED_TO_OPD',
              'COMPLETED'
            ]
          }
        },
        select: { headApprovedBudget: true, proposedBudget: true, contractDocument: { select: { contractValue: true } } }
      });
      const committedSum = otherCommitted.reduce(
        (acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
        0
      );
      const remainingDpa = Math.max(0, proposal.agenda.allocatedBudgetCeiling - committedSum);
      if (targetVal > remainingDpa) {
        return res.status(400).json({
          success: false,
          message: `Penerbitan Kontrak Ditolak: Nilai kontrak (Rp ${targetVal.toLocaleString('id-ID')}) melebihi sisa pagu DPA Agenda "${proposal.agenda.title}". Sisa DPA yang tersedia: Rp ${remainingDpa.toLocaleString('id-ID')} (dari Total Pagu Rp ${Number(proposal.agenda.allocatedBudgetCeiling).toLocaleString('id-ID')}).`
        });
      }
    }

    const kakFile = req.files?.kakFile?.[0];
    const rkaFile = req.files?.rkaFile?.[0];
    const draftContractFile = req.files?.draftContractFile?.[0];

    const kakPdfUrl = kakFile ? `/uploads/contracts/${kakFile.filename}` : null;
    const rkaPdfUrl = rkaFile ? `/uploads/contracts/${rkaFile.filename}` : null;
    const draftContractUrl = draftContractFile ? `/uploads/contracts/${draftContractFile.filename}` : null;

    // Simpan / Perbarui KAK & RKA
    const kak = await prisma.kakDocument.upsert({
      where: { proposalId: id },
      update: {
        kakNumber: kakNumber.trim(),
        rkaNumber: rkaNumber ? rkaNumber.trim() : null,
        title: title || 'KAK Riset Litbangda',
        background: background || '',
        objective: objective || '',
        scope: scope || '',
        deliverables: deliverables || '',
        allocatedBudget: parseFloat(allocatedBudget),
        ...(kakPdfUrl && { pdfFileUrl: kakPdfUrl }),
        ...(rkaPdfUrl && { rkaFileUrl: rkaPdfUrl }),
        signedById: req.user.id
      },
      create: {
        proposalId: id,
        kakNumber: kakNumber.trim(),
        rkaNumber: rkaNumber ? rkaNumber.trim() : null,
        title: title || 'KAK Riset Litbangda',
        background: background || '',
        objective: objective || '',
        scope: scope || '',
        deliverables: deliverables || '',
        allocatedBudget: parseFloat(allocatedBudget),
        pdfFileUrl: kakPdfUrl,
        rkaFileUrl: rkaPdfUrl,
        signedById: req.user.id
      }
    });

    // Simpan / Perbarui Dokumen Kontrak PKS (Draf)
    const contract = await prisma.contractDocument.upsert({
      where: { proposalId: id },
      update: {
        contractNumber: contractNumber.trim(),
        contractValue: parseFloat(allocatedBudget),
        ...(draftContractUrl && { draftContractUrl })
      },
      create: {
        proposalId: id,
        contractNumber: contractNumber.trim(),
        contractValue: parseFloat(allocatedBudget),
        draftContractUrl
      }
    });

    // Update Status Proposal menjadi CONTRACT_ISSUED dan bersihkan luaran lama jika ada
    await prisma.researchResult.deleteMany({ where: { proposalId: id } });
    await prisma.policyRecommendation.deleteMany({ where: { proposalId: id } });

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'CONTRACT_ISSUED' },
      select: { id: true, title: true, proposalNumber: true, researcherId: true, status: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'KAK_CONTRACT_ISSUED',
        details: `BRIDA (${req.user.name}) menerbitkan paket perikatan resmi: KAK (${kakNumber}), RKA (${rkaNumber || '-'}), dan Draf Kontrak (${contractNumber}). Pagu: Rp ${parseFloat(allocatedBudget).toLocaleString('id-ID')}. Status usulan kini CONTRACT_ISSUED.`
      }
    });

    // Notifikasi ke Peneliti: Harus menandatangani dan upload kembali kontrak PKS
    createNotification({
      userId: updated.researcherId,
      title: 'Paket Dokumen Perikatan Legal Diterbitkan',
      message: `Kepala BRIDA telah menerbitkan dokumen KAK, RKA, dan Draf Kontrak PKS untuk usulan "${updated.title}" (${updated.proposalNumber}). Mohon segera unduh berkas, bubuhkan tanda tangan bermaterai Rp10.000, dan unggah kembali ke sistem.`,
      type: 'ACTION_REQUIRED',
      link: `/proposals/${id}`
    }).catch(e => console.error('Notify researcher issue contract error:', e));

    return res.json({
      success: true,
      message: 'Paket Dokumen Perikatan Legal (KAK, RKA, & Draf Kontrak) berhasil diterbitkan. Peneliti kini dapat mengunduh dan menandatangani naskah perjanjian di atas materai.',
      data: { kak, contract, status: updated.status }
    });
  } catch (err) {
    console.error('Issue KAK and Contract error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses penerbitan paket KAK dan Kontrak.' });
  }
};

// =========================================================================
// 8. PENELITI UPLOAD ULANG FILE KONTRAK SAH (Role: PENELITI - Blueprint Bab 4.5)
// =========================================================================
const uploadSignedContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { researcherNotes } = req.body;

    const signedContractFile = req.files?.signedContractFile?.[0] || req.file;
    const statementLetterFile = req.files?.statementLetterFile?.[0];

    if (!signedContractFile) {
      return res.status(400).json({
        success: false,
        message: 'File scan kontrak PKS sah bertandatangan & bermaterai Rp10.000 (PDF) wajib diunggah.'
      });
    }

    // Validasi ekstensi PDF
    const ext = path.extname(signedContractFile.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({
        success: false,
        message: 'Format berkas kontrak PKS wajib berupa PDF.'
      });
    }

    // Validasi batas ukuran 25MB
    if (signedContractFile.size > 25 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran berkas kontrak PKS melebihi batas maksimal 25 MB.'
      });
    }

    if (statementLetterFile) {
      const stmtExt = path.extname(statementLetterFile.originalname).toLowerCase();
      if (stmtExt !== '.pdf') {
        return res.status(400).json({
          success: false,
          message: 'Format berkas surat kesanggupan wajib berupa PDF.'
        });
      }
      if (statementLetterFile.size > 25 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran berkas surat kesanggupan melebihi batas maksimal 25 MB.'
        });
      }
    }

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: { contractDocument: true }
    });

    if (!proposal || proposal.researcherId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya pengusul riset yang dapat mengunggah berkas kontrak sah.' });
    }

    const signedContractUrl = `/uploads/contracts/${signedContractFile.filename}`;
    const statementLetterUrl = statementLetterFile ? `/uploads/contracts/${statementLetterFile.filename}` : null;

    const updatedContract = await prisma.contractDocument.update({
      where: { proposalId: id },
      data: {
        signedContractUrl,
        ...(statementLetterUrl && { statementLetterUrl }),
        ...(researcherNotes !== undefined && { researcherNotes: researcherNotes ? researcherNotes.trim() : null }),
        signedUploadedAt: new Date(),
        isSigned: true
      }
    });

    // Riset Resmi Berjalan Aktif (CONTRACT_SIGNED)
    // Pastikan berkas hasil riset lama/prematur dibersihkan sebelum peneliti resmi menyerahkannya di tahap berikutnya
    await prisma.researchResult.deleteMany({ where: { proposalId: id } });
    await prisma.policyRecommendation.deleteMany({ where: { proposalId: id } });

    const updatedProposal = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'CONTRACT_SIGNED' }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'CONTRACT_SIGNED',
        details: `Peneliti (${req.user.name}) telah mengunggah kembali Berkas Kontrak PKS Sah bermaterai Rp10.000${
          statementLetterFile ? ' dan Surat Kesanggupan Penyelesaian Output' : ''
        }. Riset resmi aktif berjalan. Catatan Peneliti: ${researcherNotes ? researcherNotes.substring(0, 100) : '-'}.`
      }
    });

    // Notifikasi ke Kepala BRIDA & Staf BRIDA bahwa riset resmi aktif
    notifyRole('KEPALA_BRIDA', {
      title: 'Kontrak PKS Sah Telah Diunggah',
      message: `Peneliti (${req.user.name}) telah mengunggah kontrak PKS sah bermaterai untuk "${proposal.title}" (${proposal.proposalNumber}). Pelaksanaan riset resmi berjalan aktif.`,
      type: 'INFO',
      link: `/proposals/${id}`
    }).catch(e => console.error('Notify Kepala BRIDA signed contract error:', e));

    notifyRole('STAF_BRIDA', {
      title: 'Kontrak PKS Sah Telah Diunggah',
      message: `Peneliti (${req.user.name}) telah mengunggah kontrak PKS sah bermaterai untuk "${proposal.title}" (${proposal.proposalNumber}). Pelaksanaan riset resmi berjalan aktif.`,
      type: 'INFO',
      link: `/proposals/${id}`
    }).catch(e => console.error('Notify Staf BRIDA signed contract error:', e));

    return res.json({
      success: true,
      message: 'Berkas Kontrak PKS Sah dan dokumen pendukung berhasil diunggah. Riset kini resmi berstatus AKTIF berjalan.',
      data: { contract: updatedContract, status: updatedProposal.status }
    });
  } catch (err) {
    console.error('Upload signed contract error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah naskah kontrak sah.' });
  }
};

// =========================================================================
// 9. PENELITI SERAHKAN HASIL KAJIAN & REKOMENDASI (Role: PENELITI - Blueprint Bab 4.6)
// =========================================================================
const submitResults = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: { researchResult: true, kakDocument: true }
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal riset tidak ditemukan di pangkalan data SIMRIDA.'
      });
    }

    if (!['CONTRACT_SIGNED', 'RESULTS_SUBMITTED', 'RESULTS_REVISION'].includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: `Penyerahan hasil riset hanya dapat diproses bila Kontrak PKS telah disahkan (status saat ini: ${proposal.status}).`
      });
    }

    // Ambil nilai field sesuai blueprint bab 4.6 (dengan fallback backward compatibility)
    const effectiveTitle = (req.body.finalReportTitle || req.body.finalTitle || '').trim();
    const effectiveAbstract = (req.body.abstractText || req.body.abstract || '').trim();
    const effectiveRecTitle = (req.body.recommendationTitle || req.body.recTitle || '').trim();
    const effectiveRecTargetOpd = (req.body.recommendationTargetOpd || req.body.recTargetOpd || '').trim();
    const effectiveRecDesc = (req.body.recommendationDescription || req.body.recDesc || '').trim();

    // 1. Validasi Judul Laporan Akhir
    if (!effectiveTitle) {
      return res.status(400).json({
        success: false,
        message: 'Judul definitif laporan akhir riset ilmiah wajib diisi.'
      });
    }

    // 2. Validasi Abstrak / Ringkasan Eksekutif (Wajib, min 100 char)
    if (!effectiveAbstract || effectiveAbstract.length < 100) {
      return res.status(400).json({
        success: false,
        message: `Ringkasan eksekutif (abstrak) temuan utama & kesimpulan wajib diisi minimal 100 karakter (saat ini: ${effectiveAbstract.length} karakter).`
      });
    }

    // 3. Validasi Rekomendasi Kebijakan Utama untuk OPD
    if (!effectiveRecTitle) {
      return res.status(400).json({
        success: false,
        message: 'Judul rekomendasi kebijakan utama untuk OPD sasaran wajib diisi.'
      });
    }

    if (!effectiveRecTargetOpd) {
      return res.status(400).json({
        success: false,
        message: 'Nama dinas/badan pelaksana rekomendasi (OPD Sasaran) wajib diisi.'
      });
    }

    if (!effectiveRecDesc || effectiveRecDesc.length < 80) {
      return res.status(400).json({
        success: false,
        message: `Langkah strategis yang harus dieksekusi OPD dalam Renja wajib diisi minimal 80 karakter (saat ini: ${effectiveRecDesc.length} karakter).`
      });
    }

    // 4. Validasi Berkas Unggahan
    const finalReportFile = req.files?.finalReportFile?.[0];
    const academicPaperFile = req.files?.academicPaperFile?.[0];
    const policyBriefFile = req.files?.policyBriefFile?.[0];

    if (!finalReportFile && !proposal.researchResult?.finalReportFileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Berkas Dokumen Laporan Akhir Ilmiah Lengkap (PDF) wajib diunggah (maks. 50 MB).'
      });
    }

    if (finalReportFile) {
      const ext = path.extname(finalReportFile.originalname).toLowerCase();
      if (ext !== '.pdf') {
        return res.status(400).json({
          success: false,
          message: 'Berkas Laporan Akhir Ilmiah Lengkap harus berformat PDF (.pdf).'
        });
      }
      if (finalReportFile.size > 50 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran berkas Laporan Akhir Ilmiah melebihi batas maksimum 50 MB.'
        });
      }
    }

    if (academicPaperFile) {
      const ext = path.extname(academicPaperFile.originalname).toLowerCase();
      if (!['.pdf', '.doc', '.docx'].includes(ext)) {
        return res.status(400).json({
          success: false,
          message: 'Berkas Naskah Akademik harus berformat PDF atau DOC/DOCX (.pdf, .doc, .docx).'
        });
      }
      if (academicPaperFile.size > 30 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran berkas Naskah Akademik melebihi batas maksimum 30 MB.'
        });
      }
    }

    if (policyBriefFile) {
      const ext = path.extname(policyBriefFile.originalname).toLowerCase();
      if (ext !== '.pdf') {
        return res.status(400).json({
          success: false,
          message: 'Berkas Policy Brief Ringkas harus berformat PDF (.pdf).'
        });
      }
      if (policyBriefFile.size > 20 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran berkas Policy Brief melebihi batas maksimum 20 MB.'
        });
      }
    }

    const finalReportUrl = finalReportFile
      ? `/uploads/reports/${finalReportFile.filename}`
      : proposal.researchResult?.finalReportFileUrl;

    const academicPaperUrl = academicPaperFile
      ? `/uploads/reports/${academicPaperFile.filename}`
      : (proposal.researchResult?.academicPaperFileUrl || null);

    const policyBriefUrl = policyBriefFile
      ? `/uploads/reports/${policyBriefFile.filename}`
      : (proposal.researchResult?.policyBriefFileUrl || null);

    // 5. Simpan / Perbarui ResearchResult
    const result = await prisma.researchResult.upsert({
      where: { proposalId: id },
      update: {
        finalTitle: effectiveTitle,
        abstract: effectiveAbstract,
        finalReportFileUrl: finalReportUrl,
        academicPaperFileUrl: academicPaperUrl,
        policyBriefFileUrl: policyBriefUrl,
        isApprovedByHead: false,
        headApprovalNotes: null,
        headApprovedAt: null,
        submittedAt: new Date()
      },
      create: {
        proposalId: id,
        finalTitle: effectiveTitle,
        abstract: effectiveAbstract,
        finalReportFileUrl: finalReportUrl,
        academicPaperFileUrl: academicPaperUrl,
        policyBriefFileUrl: policyBriefUrl
      }
    });

    // 6. Simpan Rekomendasi Kebijakan Definitif (Blueprint Bab 4.6 Field 6, 7, 8)
    await prisma.policyRecommendation.deleteMany({
      where: { proposalId: id }
    });

    await prisma.policyRecommendation.create({
      data: {
        proposalId: id,
        resultId: result.id,
        recommendationCode: 'REK-01',
        title: effectiveRecTitle,
        sector: proposal.researchField || 'Perencanaan & Kebijakan Daerah',
        targetOpdName: effectiveRecTargetOpd,
        description: effectiveRecDesc,
        expectedOutcome: 'Tercapainya perbaikan tata kelola dan efektivitas implementasi kebijakan OPD sasaran sesuai mandat Renja.'
      }
    });

    // Dukung tambahan rekomendasi bila dikirim via array JSON
    if (req.body.recommendations) {
      try {
        const parsedRecs = typeof req.body.recommendations === 'string'
          ? JSON.parse(req.body.recommendations)
          : req.body.recommendations;
        if (Array.isArray(parsedRecs)) {
          let codeIdx = 2;
          for (const rec of parsedRecs) {
            if (rec.title && rec.targetOpdName && rec.description) {
              await prisma.policyRecommendation.create({
                data: {
                  proposalId: id,
                  resultId: result.id,
                  recommendationCode: `REK-${String(codeIdx).padStart(2, '0')}`,
                  title: rec.title.trim(),
                  sector: rec.sector || proposal.researchField || 'Inovasi Daerah',
                  targetOpdName: rec.targetOpdName.trim(),
                  description: rec.description.trim(),
                  expectedOutcome: rec.expectedOutcome || ''
                }
              });
              codeIdx++;
            }
          }
        }
      } catch (parseErr) {
        console.warn('Non-critical: parsing extra recommendations JSON failed:', parseErr);
      }
    }

    // 7. Update status usulan riset
    const updated = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'RESULTS_SUBMITTED' }
    });

    // 8. Pencatatan Audit Log Resmi
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'RESULTS_SUBMITTED',
        details: `Peneliti (${req.user.name}) resmi menyerahkan Dokumen Laporan Akhir Ilmiah Lengkap, Naskah Akademik, Policy Brief, serta Rekomendasi Kebijakan Definitif untuk OPD ${effectiveRecTargetOpd}.`
      }
    });

    // Notifikasi ke Kepala BRIDA (Penyerahan Baru atau Revisi)
    const isRevisionResubmit = proposal.status === 'RESULTS_REVISION';
    notifyRole('KEPALA_BRIDA', {
      title: isRevisionResubmit ? 'Naskah Revisi Diserahkan Peneliti' : 'Penyerahan Naskah Akademik Riset',
      message: isRevisionResubmit
        ? `Peneliti (${req.user.name}) telah mengunggah perbaikan Naskah Akademik untuk "${proposal.title}" (${proposal.proposalNumber}). Siap untuk ditinjau ulang.`
        : `Peneliti (${req.user.name}) telah menyerahkan Laporan Akhir & Naskah Akademik untuk "${proposal.title}" (${proposal.proposalNumber}). Menunggu telaah mutu & pengesahan kas Anda.`,
      type: 'ACTION_REQUIRED',
      link: `/proposals/${id}`
    }).catch(e => console.error('Notify Kepala BRIDA submit results error:', e));

    return res.json({
      success: true,
      message: 'Hasil kajian ilmiah dan rekomendasi kebijakan definitif berhasil diserahkan ke BRIDA.',
      data: { result, status: updated.status }
    });
  } catch (err) {
    console.error('Submit results error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah dan memproses hasil kajian.' });
  }
};

// =========================================================================
// 9.1 UJI KELAYAKAN MUTU & PENGESAHAN NASKAH AKADEMIK (Role: KEPALA_BRIDA)
// Sesuai Siklus Penyerapan Kas Induk 100% Definitif
// =========================================================================
const reviewResearchResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body; // decision: 'APPROVE' | 'REVISE'

    if (!decision || (decision !== 'APPROVE' && decision !== 'REVISE')) {
      return res.status(400).json({
        success: false,
        message: 'Keputusan evaluasi naskah (APPROVE / REVISE) wajib dipilih oleh Kepala BRIDA.'
      });
    }

    if (!notes || notes.trim().length < 15) {
      return res.status(400).json({
        success: false,
        message: `Catatan resmi evaluasi naskah akademik dari Kepala BRIDA wajib diisi minimal 15 karakter (saat ini ${notes ? notes.trim().length : 0} karakter).`
      });
    }

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: { researchResult: true, researcher: true }
    });

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Usulan riset tidak ditemukan.' });
    }

    if (!['RESULTS_SUBMITTED', 'RESULTS_REVISION'].includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: `Evaluasi naskah hanya dapat dilakukan pada usulan yang telah menyerahkan hasil riset (status saat ini: ${proposal.status}).`
      });
    }

    const isApprove = decision === 'APPROVE';
    const newStatus = isApprove ? 'RESULTS_APPROVED' : 'RESULTS_REVISION';

    const updatedResult = await prisma.researchResult.update({
      where: { proposalId: id },
      data: {
        isApprovedByHead: isApprove,
        headApprovalNotes: isApprove ? notes.trim() : null,
        headApprovedAt: isApprove ? new Date() : null,
        revisionNotes: !isApprove ? notes.trim() : null,
        ...(!isApprove && { revisionCount: { increment: 1 } })
      }
    });

    const updatedProposal = await prisma.researchProposal.update({
      where: { id },
      data: { status: newStatus }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: isApprove ? 'RESULTS_APPROVED_BY_HEAD' : 'RESULTS_REVISION_REQUESTED',
        details: isApprove
          ? `Kepala BRIDA (${req.user.name}) MENGESAHKAN Naskah Akademik & Laporan Akhir Ilmiah. Anggaran kas induk terealisasi 100% dan naskah siap didisposisikan ke OPD. Catatan: ${notes.trim()}`
          : `Kepala BRIDA (${req.user.name}) MEMINTA REVISI naskah hasil riset kepada peneliti (${proposal.researcher?.name}). Anggaran kas belum dicairkan. Arahan: ${notes.trim()}`
      }
    });

    // Notifikasi hasil review naskah akhir ke Peneliti
    if (isApprove) {
      createNotification({
        userId: proposal.researcherId,
        title: 'Naskah Akademik Resmi Disahkan!',
        message: `Selamat! Naskah Akademik untuk "${proposal.title}" (${proposal.proposalNumber}) telah disahkan oleh Kepala BRIDA. Hak pencairan kas 100% telah disetujui. Catatan: ${notes.trim()}`,
        type: 'SUCCESS',
        link: `/proposals/${id}`
      }).catch(e => console.error('Notify researcher results approved error:', e));
    } else {
      createNotification({
        userId: proposal.researcherId,
        title: 'Arahan Revisi Naskah Akademik',
        message: `Kepala BRIDA meminta perbaikan Naskah Akademik untuk "${proposal.title}" (${proposal.proposalNumber}). Arahan pimpinan: ${notes.trim().substring(0, 150)}...`,
        type: 'ACTION_REQUIRED',
        link: `/proposals/${id}`
      }).catch(e => console.error('Notify researcher results revision error:', e));
    }

    return res.json({
      success: true,
      message: isApprove
        ? 'Naskah akademik resmi DISAHKAN oleh Kepala BRIDA. Pagu kas induk resmi terserap riil 100% dan naskah kini siap didisposisikan ke OPD.'
        : 'Arahan perbaikan naskah berhasil dikirimkan kepada peneliti. Status usulan kini RESULTS_REVISION dan kas daerah belum dicairkan.',
      data: { proposal: updatedProposal, result: updatedResult }
    });
  } catch (err) {
    console.error('Review research results error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses evaluasi naskah hasil riset.' });
  }
};

// =========================================================================
// 10. BRIDA FORWARD / DISPOSISI KE OPD (Role: KEPALA_BRIDA / STAF_BRIDA)
// Multi-OPD Blast Support (Blueprint Bab 4.7)
// =========================================================================
const forwardToOpd = async (req, res) => {
  try {
    const { id } = req.params;
    const { opdUserId, opdUserIds, dispositionNumber, urgency, notes, responseDeadline } = req.body;

    // Kumpulkan daftar OPD ID sasaran (bisa tunggal maupun blast multi-OPD)
    let targetOpdIds = [];
    if (Array.isArray(opdUserIds) && opdUserIds.length > 0) {
      targetOpdIds = opdUserIds.filter(Boolean);
    } else if (opdUserId) {
      targetOpdIds = [opdUserId];
    }
    // Hapus duplikasi jika ada
    targetOpdIds = Array.from(new Set(targetOpdIds));

    if (targetOpdIds.length === 0 || !dispositionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Minimal satu OPD sasaran dan nomor surat pengantar disposisi wajib diisi.'
      });
    }

    const proposal = await prisma.researchProposal.findUnique({
      where: { id },
      include: {
        researchResult: true,
        dispositions: true
      }
    });

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Usulan penelitian tidak ditemukan.' });
    }

    const allowedStatuses = ['RESULTS_APPROVED', 'FORWARDED_TO_OPD', 'COMPLETED'];
    if (!allowedStatuses.includes(proposal.status) || !proposal.researchResult?.isApprovedByHead) {
      return res.status(400).json({
        success: false,
        message: `Disposisi ke OPD belum dapat dilakukan. Naskah hasil riset wajib melewati telaah mutu dan resmi disahkan oleh Kepala BRIDA terlebih dahulu (Status saat ini: ${proposal.status}).`
      });
    }

    // Ambil akun user OPD sasaran
    const opdUsers = await prisma.user.findMany({
      where: {
        id: { in: targetOpdIds },
        role: 'OPD'
      },
      select: { id: true, name: true, institutionName: true }
    });

    if (opdUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Akun OPD tujuan tidak valid atau tidak ditemukan.'
      });
    }

    const createdDispositions = [];
    const baseDispNum = dispositionNumber.trim();

    for (let i = 0; i < opdUsers.length; i++) {
      const targetUser = opdUsers[i];
      const currentDispNum = baseDispNum;

      // Cek apakah OPD ini sudah menerima disposisi untuk proposal ini
      const alreadyDisp = proposal.dispositions.find((d) => d.opdUserId === targetUser.id);
      let disposition;
      if (alreadyDisp) {
        disposition = await prisma.opdDisposition.update({
          where: { id: alreadyDisp.id },
          data: {
            dispositionNumber: currentDispNum,
            urgency: urgency || 'SEGERA',
            notes: notes ? notes.trim() : null,
            responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
            status: 'SENT'
          }
        });
      } else {
        disposition = await prisma.opdDisposition.create({
          data: {
            proposalId: id,
            opdUserId: targetUser.id,
            dispositionNumber: currentDispNum,
            urgency: urgency || 'SEGERA',
            notes: notes ? notes.trim() : null,
            responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
            status: 'SENT'
          }
        });
      }
      createdDispositions.push(disposition);

      // Notifikasi ke masing-masing OPD sasaran
      createNotification({
        userId: targetUser.id,
        title: 'Disposisi Rekomendasi Riset Masuk',
        message: `Kepala BRIDA mendisposisikan naskah kajian ilmiah "${proposal.title}" (No. Disposisi: ${currentDispNum}). Mohon dipelajari dan disiapkan tindak lanjutnya.`,
        type: 'ACTION_REQUIRED',
        link: `/dispositions`
      }).catch((e) => console.error('Notify OPD disposition error:', e));
    }

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'FORWARDED_TO_OPD' }
    });

    const opdNamesList = opdUsers.map((u) => u.institutionName || u.name).join(', ');
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'FORWARDED_TO_OPD',
        details: `Kepala BRIDA mendisposisikan naskah rekomendasi riset (No: ${baseDispNum}) secara blast ke ${opdUsers.length} OPD: ${opdNamesList}.`
      }
    });

    return res.json({
      success: true,
      message: `Naskah rekomendasi berhasil didisposisikan ke ${createdDispositions.length} Perangkat Daerah (OPD).`,
      data: createdDispositions
    });
  } catch (err) {
    console.error('Forward to OPD error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mendisposisikan ke OPD.' });
  }
};

// =========================================================================
// 11. OPD UPLOAD BUKTI TINDAK LANJUT (Role: OPD - Blueprint Bab 4.8)
// =========================================================================
const submitOpdResponse = async (req, res) => {
  try {
    const { id } = req.params; // proposalId
    const {
      dispositionId,
      recommendationId,
      actionPlanDetails,
      policyForm,
      targetYear,
      targetImplementationYear
    } = req.body;

    // 1. Validasi dispositionId (Field 1 - Hidden Input)
    if (!dispositionId) {
      return res.status(400).json({
        success: false,
        message: 'ID disposisi yang ditindaklanjuti wajib disertakan.'
      });
    }

    const disposition = await prisma.opdDisposition.findUnique({
      where: { id: dispositionId }
    });
    if (!disposition) {
      return res.status(404).json({
        success: false,
        message: 'Data lembar disposisi BRIDA tidak ditemukan.'
      });
    }

    // 2. Validasi policyForm (Field 2 - Dropdown Select)
    if (!policyForm || !policyForm.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bentuk kebijakan implementasi OPD wajib dipilih (Renja/RKPD, Perda, Perbup/Perwali, SK Kepala Dinas, SOP Teknis).'
      });
    }

    // 3. Validasi targetYear (Field 3 - Text Input, Format YYYY)
    const rawYear = targetYear || targetImplementationYear;
    if (!rawYear) {
      return res.status(400).json({
        success: false,
        message: 'Tahun realisasi anggaran/program wajib diisi (format YYYY, contoh: 2027).'
      });
    }
    const cleanYear = String(rawYear).trim();
    const parsedYear = parseInt(cleanYear, 10);
    if (isNaN(parsedYear) || cleanYear.length !== 4 || parsedYear < 2020 || parsedYear > 2099) {
      return res.status(400).json({
        success: false,
        message: 'Tahun realisasi anggaran/program wajib berformat 4 digit tahun (YYYY, contoh: 2027).'
      });
    }

    // 4. Validasi actionPlanDetails (Field 4 - Textarea, min 50 char)
    if (!actionPlanDetails || actionPlanDetails.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: `Uraian sub-kegiatan, target output, dan alokasi sumber daya OPD wajib diisi minimal 50 karakter (saat ini ${actionPlanDetails ? actionPlanDetails.trim().length : 0} karakter).`
      });
    }

    // 5. Validasi proofFile (Field 5 - Upload PDF, max 30 MB)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Berkas dokumen bukti regulasi/Renja resmi bertandatangan Kepala Dinas (PDF) wajib diunggah.'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({
        success: false,
        message: 'Berkas dokumen bukti tindak lanjut OPD harus berformat PDF (.pdf).'
      });
    }

    if (req.file.size > 30 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran berkas bukti tindak lanjut OPD melebihi batas maksimum 30 MB.'
      });
    }

    // Ambil valid recommendation id jika tersedia
    let validRecId = null;
    if (recommendationId && recommendationId !== 'dummy-rec-id' && recommendationId !== 'rec-default') {
      const recExists = await prisma.policyRecommendation.findUnique({ where: { id: recommendationId } });
      if (recExists) validRecId = recExists.id;
    }
    if (!validRecId) {
      const firstRec = await prisma.policyRecommendation.findFirst({ where: { proposalId: id } });
      if (firstRec) validRecId = firstRec.id;
    }

    const proofFileUrl = `/uploads/responses/${req.file.filename}`;

    const response = await prisma.opdActionResponse.create({
      data: {
        dispositionId,
        recommendationId: validRecId,
        opdUserId: req.user.id,
        actionPlanDetails: actionPlanDetails.trim(),
        policyForm: policyForm.trim(),
        targetImplementationYear: parsedYear,
        proofFileUrl
      }
    });

    // Tandai disposisi selesai (RESPONDED)
    await prisma.opdDisposition.update({
      where: { id: dispositionId },
      data: { status: 'RESPONDED' }
    });

    // Cek apakah seluruh disposisi OPD untuk proposal ini telah direspon
    const remainingDispositions = await prisma.opdDisposition.count({
      where: {
        proposalId: id,
        status: { not: 'RESPONDED' }
      }
    });

    // Jika seluruh OPD telah menyerahkan tindak lanjut, status beralih ke COMPLETED
    const updatedProposal = await prisma.researchProposal.update({
      where: { id },
      data: { status: remainingDispositions === 0 ? 'COMPLETED' : 'FORWARDED_TO_OPD' }
    });

    // Pencatatan Audit Trail Log Resmi
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'OPD_FOLLOWED_UP',
        details: `OPD (${req.user.name}) resmi menyerahkan bukti tindak lanjut bentuk ${policyForm.trim()} TA ${parsedYear}: ${actionPlanDetails.trim().substring(0, 100)}...`
      }
    });

    // Notifikasi ke Kepala BRIDA dan Peneliti bahwa riset telah ditindaklanjuti
    notifyRole('KEPALA_BRIDA', {
      title: 'Tindak Lanjut OPD Telah Diserahkan',
      message: `Perangkat Daerah (${req.user.name}) telah mengunggah laporan & bukti tindak lanjut untuk rekomendasi "${updatedProposal.title}". Siklus alur riset resmi tuntas paripurna (COMPLETED).`,
      type: 'SUCCESS',
      link: `/dispositions`
    }).catch(e => console.error('Notify Kepala BRIDA OPD response error:', e));

    createNotification({
      userId: updatedProposal.researcherId,
      title: 'Hasil Riset Resmi Diterapkan OPD',
      message: `Rekomendasi riset Anda ("${updatedProposal.title}") telah resmi ditindaklanjuti oleh dinas (${req.user.name}) dalam bentuk ${policyForm.trim()}. Terima kasih atas kontribusi nyata bagi daerah.`,
      type: 'SUCCESS',
      link: `/proposals/${id}`
    }).catch(e => console.error('Notify researcher OPD response error:', e));

    return res.json({
      success: true,
      message: 'Laporan tindak lanjut dan berkas bukti regulasi OPD berhasil diserahkan ke BRIDA. Seluruh siklus alur Litbangda SIMRIDA telah tuntas paripurna!',
      data: { response, status: updatedProposal.status }
    });
  } catch (err) {
    console.error('Submit OPD response error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah laporan dan bukti tindak lanjut OPD.' });
  }
};

// =========================================================================
// 12. DAFTAR DISPOSISI REKOMENDASI (Untuk Hub /dispositions)
// =========================================================================
const listDispositions = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'OPD') {
      filter.opdUserId = req.user.id;
    }

    const dispositions = await prisma.opdDisposition.findMany({
      where: filter,
      include: {
        proposal: {
          include: {
            researcher: { select: { name: true, institutionName: true, email: true } },
            researchResult: true,
            policyRecommendations: true
          }
        },
        opdUser: { select: { id: true, name: true, institutionName: true } },
        responses: true
      },
      orderBy: { forwardedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: dispositions
    });
  } catch (err) {
    console.error('List dispositions error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar disposisi.' });
  }
};

// =========================================================================
// 13. DAFTAR KAK & KONTRAK RISET (Untuk Hub /contracts)
// =========================================================================
const listContracts = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'PENELITI') {
      filter.proposal = { researcherId: req.user.id };
    }

    const contracts = await prisma.contractDocument.findMany({
      where: filter,
      include: {
        proposal: {
          include: {
            researcher: { select: { name: true, institutionName: true, email: true } },
            kakDocument: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: contracts
    });
  } catch (err) {
    console.error('List contracts error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar kontrak.' });
  }
};

// =========================================================================
// 14. HELPER: RANKING KOMPETISI PROPOSAL PER AGENDA RISET (Call for Proposals)
// =========================================================================
const getAgendaCompetitiveRanking = async (req, res) => {
  try {
    const { agendaId } = req.params;

    const agenda = await prisma.researchAgenda.findUnique({
      where: { id: agendaId },
      include: {
        originNeed: {
          select: {
            needCode: true,
            title: true,
            thematicArea: true,
            opdUser: { select: { name: true, institutionName: true } }
          }
        },
        createdBy: { select: { name: true, position: true } }
      }
    });

    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda Riset Daerah tidak ditemukan.'
      });
    }

    // 1. Ambil HANYA usulan yang sah lolos Gerbang 1 (ADMIN_PASSED) dan aktif berkompetisi
    const activeProposals = await prisma.researchProposal.findMany({
      where: {
        agendaId,
        submissionType: 'AGENDA_COMPETITIVE',
        status: {
          notIn: ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD', 'SUBMITTED']
        }
      },
      include: {
        researcher: {
          select: { id: true, name: true, email: true, institutionName: true, phone: true }
        },
        kakDocument: {
          select: { id: true, kakNumber: true, allocatedBudget: true }
        },
        contractDocument: {
          select: { id: true, contractNumber: true, isSigned: true }
        }
      },
      orderBy: [
        { opdRelevanceScore: 'desc' },
        { submittedAt: 'asc' }
      ]
    });

    // 2. Ambil usulan yang gugur / dikembalikan ke peneliti untuk arsip terpisah
    const eliminatedProposals = await prisma.researchProposal.findMany({
      where: {
        agendaId,
        submissionType: 'AGENDA_COMPETITIVE',
        status: {
          in: ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD']
        }
      },
      include: {
        researcher: {
          select: { id: true, name: true, email: true, institutionName: true, phone: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Helper hitung skor pasti formula Blueprint Bab 4.3: (K1*0.25) + (K2*0.35) + (K3*0.25) + (K4*0.15)
    const getExactProposalScore = (p) => {
      if (p.opdRelevanceScore !== null && p.opdRelevanceScore !== undefined) {
        return Number(p.opdRelevanceScore);
      }
      const ai = p.aiGate2Analysis;
      if (ai && typeof ai === 'object') {
        const k1 = Number(ai.scoreScientificQuality) || 0;
        const k2 = Number(ai.scoreOpdRelevance) || 0;
        const k3 = Number(ai.scorePolicyApplicability) || 0;
        const k4 = Number(ai.scoreBudgetFeasibility) || 0;
        return Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
      }
      return -1;
    };

    // Urutkan usulan aktif: Prioritaskan nilai resmi Reviewer Manusia (opdRelevanceScore), jika belum dinilai gunakan skor pasti AI
    const sortedProposals = [...activeProposals].sort((a, b) => {
      const scoreA = getExactProposalScore(a);
      const scoreB = getExactProposalScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

    // Tentukan status pemenang (Winner vs Non-Winner)
    const winnerStatuses = [
      'APPROVED',
      'CONTRACT_ISSUED',
      'CONTRACT_SIGNED',
      'RESULTS_SUBMITTED',
      'RESULTS_REVISION',
      'RESULTS_APPROVED',
      'FORWARDED_TO_OPD',
      'COMPLETED'
    ];
    const rankedProposals = sortedProposals.map((p, index) => {
      const isWinner = winnerStatuses.includes(p.status);
      const aiEval = p.aiGate2Analysis;
      let computedAiScore = null;
      if (aiEval && typeof aiEval === 'object') {
        const k1 = Number(aiEval.scoreScientificQuality) || 0;
        const k2 = Number(aiEval.scoreOpdRelevance) || 0;
        const k3 = Number(aiEval.scorePolicyApplicability) || 0;
        const k4 = Number(aiEval.scoreBudgetFeasibility) || 0;
        computedAiScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
        aiEval.weightedScore = computedAiScore;
      }
      return {
        ...p,
        rank: index + 1,
        isWinner,
        isEliminated: false,
        effectiveScore: p.opdRelevanceScore !== null && p.opdRelevanceScore !== undefined ? Number(p.opdRelevanceScore) : computedAiScore,
        isAiGraded: Boolean(computedAiScore !== null),
        aiScore: computedAiScore,
        aiRank: aiEval?.rank ?? (index + 1),
        aiIsWinner: aiEval?.isWinner ?? (index === 0),
        aiCompetitiveAdvantage: aiEval?.competitiveAdvantage ?? null,
        aiOpdRelevanceNotes: aiEval?.opdRelevanceNotes ?? null
      };
    });

    // Hitung Kumulatif Pagu DPA Agenda untuk Mendukung Multi-Awardee
    const allocatedDpaCeiling = agenda?.allocatedBudgetCeiling || 0;
    const approvedAwardees = rankedProposals.filter((p) => p.isWinner);
    const committedDpaBudget = approvedAwardees.reduce(
      (acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
      0
    );
    const remainingDpaBudget = Math.max(0, allocatedDpaCeiling - committedDpaBudget);
    const dpaAbsorptionPercent = allocatedDpaCeiling > 0
      ? Number(((committedDpaBudget / allocatedDpaCeiling) * 100).toFixed(1))
      : 0;
    const canApproveMore = remainingDpaBudget > 0;

    return res.json({
      success: true,
      data: {
        agenda,
        totalCompetitors: activeProposals.length,
        dpaSummary: {
          allocatedBudgetCeiling: allocatedDpaCeiling,
          committedDpaBudget,
          remainingDpaBudget,
          dpaAbsorptionPercent,
          approvedCount: approvedAwardees.length,
          approvedAwardees: approvedAwardees.length,
          canApproveMore,
          hasRemainingQuota: remainingDpaBudget > 0
        },
        hasApprovedWinner: approvedAwardees.length > 0,
        approvedAwardees,
        winnerProposal: approvedAwardees[0] || null,
        rankedProposals,
        eliminatedProposals: eliminatedProposals.map((p) => ({
          ...p,
          isEliminated: true,
          eliminationStage:
            p.status === 'REJECTED_DUPLICATE'
              ? 'Gugur di Gerbang 1 (Administrasi & Duplikasi)'
              : p.status === 'REJECTED_OPD_MISMATCH'
              ? 'Gugur di Gerbang 2 (Relevansi Renja OPD)'
              : 'Gugur di Gerbang 3 (Kepala BRIDA)',
          eliminationNotes:
            p.adminDuplicateNotes ||
            p.opdRelevanceNotes ||
            p.headDecisionNotes ||
            'Usulan tidak memenuhi standar verifikasi litbangda dan telah dikembalikan ke peneliti.'
        }))
      }
    });
  } catch (err) {
    console.error('getAgendaCompetitiveRanking error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat papan peringkat kompetisi agenda riset.'
    });
  }
};

// =========================================================================
// 15. RINGKASAN METRIK BERKAS DIKEMBALIKAN / GUGUR
// =========================================================================
const getReturnedProposalsSummary = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'PENELITI') {
      filter.researcherId = req.user.id;
    }

    const [totalReturned, g1Count, g2Count, g3Count] = await Promise.all([
      prisma.researchProposal.count({
        where: {
          ...filter,
          status: { in: ['REJECTED_DUPLICATE', 'REJECTED_OPD_MISMATCH', 'REJECTED_BY_HEAD'] }
        }
      }),
      prisma.researchProposal.count({
        where: {
          ...filter,
          status: 'REJECTED_DUPLICATE'
        }
      }),
      prisma.researchProposal.count({
        where: {
          ...filter,
          status: 'REJECTED_OPD_MISMATCH'
        }
      }),
      prisma.researchProposal.count({
        where: {
          ...filter,
          status: 'REJECTED_BY_HEAD'
        }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalReturned,
        g1Count,
        g2Count,
        g3Count
      }
    });
  } catch (err) {
    console.error('getReturnedProposalsSummary error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat ringkasan berkas dikembalikan.' });
  }
};

module.exports = {
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
};
