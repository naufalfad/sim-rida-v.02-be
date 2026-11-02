const path = require('path');
const prisma = require('../../prisma');
const { calculateWorkingDaysDeadline, getRemainingWorkingDays } = require('../../utils/sla');

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
    const { status, agendaId, search } = req.query;
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

    if (status) filter.status = status;
    if (agendaId) filter.agendaId = agendaId;
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
          select: { id: true, title: true, year: true }
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
          select: { id: true, kakNumber: true, allocatedBudget: true, startDate: true, endDate: true }
        },
        contractDocument: {
          select: { id: true, contractNumber: true, isSigned: true, signedUploadedAt: true }
        },
        _count: {
          select: { policyRecommendations: true, dispositions: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Tambahkan info hitung mundur SLA hari kerja
    const enrichedProposals = proposals.map((p) => ({
      ...p,
      remainingWorkingDays: getRemainingWorkingDays(p.slaDeadline)
    }));

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

    return res.json({
      success: true,
      data: {
        ...proposal,
        remainingWorkingDays: getRemainingWorkingDays(proposal.slaDeadline)
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
// 5. GERBANG 2: UJI KELAYAKAN SUBSTANSI & RELEVANSI RENJA OPD (Role: REVIEWER_BRIDA)
// Sesuai Dokumen Blueprint SIM-RIDA Bab 4.3 (Rubrik 4 Parameter Berbobot)
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
// Sesuai Dokumen Blueprint SIM-RIDA Bab 4.4 (Ketersediaan Anggaran & Kemanfaatan Daerah)
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
// Sesuai Dokumen Blueprint SIM-RIDA Bab 4.5 (Paket 3 Berkas Dokumen Resmi)
// =========================================================================
const issueKakAndContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kakNumber,        // 1. Nomor Register KAK resmi BRIDA (Wajib, Format Baku)
      rkaNumber,        // 3. Nomor DPA / RKA Dokumen Anggaran Riset (Wajib)
      contractNumber,   // 5. Nomor Perjanjian Kerjasama (PKS) BRIDA (Wajib, Format Baku)
      allocatedBudget,  // 7. Nilai kontrak perikatan hukum yang mengikat (Rp) (Wajib, > 0)
      startDate,        // 8. Tanggal dimulainya masa pelaksanaan riset (Wajib)
      endDate,          // 9. Batas akhir penyerahan laporan akhir dan rekomendasi (Wajib, > startDate)
      title,
      background,
      objective,
      scope,
      deliverables
    } = req.body;

    if (!kakNumber || !contractNumber || !allocatedBudget || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Nomor Register KAK, nomor Kontrak PKS, nilai kontrak definitif, dan jangka waktu pelaksanaan wajib diisi lengkap.'
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal batas akhir penyerahan laporan riset (endDate) harus lebih besar dari tanggal mulai (startDate).'
      });
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
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(draftContractUrl && { draftContractUrl })
      },
      create: {
        proposalId: id,
        contractNumber: contractNumber.trim(),
        contractValue: parseFloat(allocatedBudget),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        draftContractUrl
      }
    });

    // Update Status Proposal menjadi CONTRACT_ISSUED
    const updated = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'CONTRACT_ISSUED' }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'KAK_CONTRACT_ISSUED',
        details: `BRIDA (${req.user.name}) menerbitkan paket perikatan resmi: KAK (${kakNumber}), RKA (${rkaNumber || '-'}), dan Draf Kontrak (${contractNumber}). Pagu: Rp ${parseFloat(allocatedBudget).toLocaleString('id-ID')}. Status usulan kini CONTRACT_ISSUED.`
      }
    });

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
        message: 'Proposal riset tidak ditemukan di pangkalan data SIM-RIDA.'
      });
    }

    if (!['CONTRACT_SIGNED', 'RESULTS_SUBMITTED'].includes(proposal.status)) {
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
// 10. BRIDA FORWARD / DISPOSISI KE OPD (Role: KEPALA_BRIDA / STAF_BRIDA)
// =========================================================================
const forwardToOpd = async (req, res) => {
  try {
    const { id } = req.params;
    const { opdUserId, dispositionNumber, urgency, notes, responseDeadline } = req.body;

    if (!opdUserId || !dispositionNumber) {
      return res.status(400).json({
        success: false,
        message: 'OPD tujuan dan nomor surat pengantar disposisi wajib diisi.'
      });
    }

    const disposition = await prisma.opdDisposition.create({
      data: {
        proposalId: id,
        opdUserId,
        dispositionNumber: dispositionNumber.trim(),
        urgency: urgency || 'SEGERA',
        notes: notes ? notes.trim() : null,
        responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
        status: 'SENT'
      }
    });

    const updated = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'FORWARDED_TO_OPD' }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: id,
        action: 'FORWARDED_TO_OPD',
        details: `BRIDA mendisposisikan rekomendasi kajian kepada OPD dengan nomor surat: ${dispositionNumber}.`
      }
    });

    return res.json({
      success: true,
      message: 'Naskah rekomendasi berhasil didisposisikan ke OPD terkait.',
      data: disposition
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

    // Tandai usulan riset tuntas (COMPLETED)
    const updatedProposal = await prisma.researchProposal.update({
      where: { id },
      data: { status: 'COMPLETED' }
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

    return res.json({
      success: true,
      message: 'Laporan tindak lanjut dan berkas bukti regulasi OPD berhasil diserahkan ke BRIDA. Seluruh siklus alur Litbangda SIM-RIDA telah tuntas paripurna!',
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
  forwardToOpd,
  submitOpdResponse,
  listDispositions,
  listContracts
};
