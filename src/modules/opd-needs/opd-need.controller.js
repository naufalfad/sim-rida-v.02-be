const prisma = require('../../prisma');
const { checkAgendaFiscalCapacity } = require('../agendas/agenda.controller');

// Helper penomoran otomatis usulan kebutuhan OPD: NEED-YYYY-0001
const generateNeedCode = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.opdResearchNeed.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `NEED-${year}-${nextNum}`;
};

// =========================================================================
// 1. PENGAJUAN USULAN KEBUTUHAN RISET OLEH OPD (Form 4.0.1)
// =========================================================================
const createOpdNeed = async (req, res) => {
  try {
    const {
      title,
      thematicArea,
      urgencyBackground,
      expectedOutputs,
      targetRenjaIku,
      targetLocation,
      dataReadiness,
      dataAvailabilityNotes,
      targetYear,
      picName,
      picPhone
    } = req.body;

    // Validasi Field Wajib
    if (!title || title.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Judul rumusan kebutuhan riset wajib diisi minimal 20 karakter.'
      });
    }

    if (!thematicArea) {
      return res.status(400).json({
        success: false,
        message: 'Bidang tematik prioritas wajib dipilih.'
      });
    }

    if (!urgencyBackground || urgencyBackground.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Deskripsi permasalahan nyata di lapangan wajib diisi minimal 100 karakter.'
      });
    }

    if (!expectedOutputs) {
      return res.status(400).json({
        success: false,
        message: 'Target luaran kebijakan yang diharapkan OPD wajib dipilih minimal satu.'
      });
    }

    if (!targetRenjaIku || targetRenjaIku.trim().length < 30) {
      return res.status(400).json({
        success: false,
        message: 'Sasaran Program Renja dan IKU Kepala Dinas wajib diisi minimal 30 karakter.'
      });
    }

    if (!targetLocation) {
      return res.status(400).json({
        success: false,
        message: 'Lokus wilayah masalah spesifik di daerah wajib diisi.'
      });
    }

    const cleanYear = parseInt(targetYear, 10);
    if (!cleanYear || isNaN(cleanYear) || cleanYear < 2024 || cleanYear > 2035) {
      return res.status(400).json({
        success: false,
        message: 'Target tahun anggaran pelaksanaan riset wajib 4 digit tahun yang valid (contoh: 2027).'
      });
    }

    if (!picName || !picPhone) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan nomor kontak WhatsApp PIC teknis OPD wajib diisi.'
      });
    }

    // Dokumen Pendukung (Opsional)
    let supportDocUrl = null;
    if (req.file) {
      supportDocUrl = `/uploads/needs/${req.file.filename}`;
    }

    const needCode = await generateNeedCode();
    const isDataReady = dataReadiness === 'true' || dataReadiness === true || dataReadiness === '1';

    const newNeed = await prisma.opdResearchNeed.create({
      data: {
        needCode,
        opdUserId: req.user.id,
        title: title.trim(),
        thematicArea: thematicArea.trim(),
        urgencyBackground: urgencyBackground.trim(),
        expectedOutputs: typeof expectedOutputs === 'string' ? expectedOutputs : JSON.stringify(expectedOutputs),
        targetRenjaIku: targetRenjaIku.trim(),
        targetLocation: targetLocation.trim(),
        dataReadiness: isDataReady,
        dataAvailabilityNotes: dataAvailabilityNotes ? dataAvailabilityNotes.trim() : null,
        targetYear: cleanYear,
        picName: picName.trim(),
        picPhone: picPhone.trim(),
        supportDocUrl,
        status: 'SUBMITTED'
      },
      include: {
        opdUser: {
          select: { id: true, name: true, institutionName: true, email: true }
        }
      }
    });

    // Catat Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'OPD_NEED_SUBMITTED',
        details: `OPD ${req.user.institutionName || req.user.name} mengajukan usulan kebutuhan riset: ${needCode} - ${title.trim()}`
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Usulan kebutuhan riset daerah berhasil diserahkan ke SIMRIDA.',
      data: newNeed
    });
  } catch (err) {
    console.error('Error createOpdNeed:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat menyimpan usulan kebutuhan OPD.'
    });
  }
};

// =========================================================================
// 2. DAFTAR USULAN KEBUTUHAN RISET (List & Filter)
// =========================================================================
const getOpdNeeds = async (req, res) => {
  try {
    const { status, thematicArea, year, search, opdUserId } = req.query;
    const filter = {};

    // Jika role OPD, tampilkan miliknya secara default kecuali jika minta all
    if (req.user.role === 'OPD') {
      filter.opdUserId = req.user.id;
    } else if (opdUserId) {
      filter.opdUserId = opdUserId;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (thematicArea && thematicArea !== 'ALL') {
      filter.thematicArea = thematicArea;
    }

    if (year) {
      filter.targetYear = parseInt(year, 10);
    }

    if (search) {
      filter.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { needCode: { contains: search, mode: 'insensitive' } },
        { targetLocation: { contains: search, mode: 'insensitive' } },
        { opdUser: { name: { contains: search, mode: 'insensitive' } } },
        { opdUser: { institutionName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const needs = await prisma.opdResearchNeed.findMany({
      where: filter,
      include: {
        opdUser: {
          select: { id: true, name: true, institutionName: true, email: true }
        },
        curatorUser: {
          select: { id: true, name: true, role: true }
        },
        parentNeed: {
          select: {
            id: true,
            needCode: true,
            title: true,
            opdUser: { select: { id: true, name: true, institutionName: true } }
          }
        },
        clusteredNeeds: {
          include: {
            opdUser: { select: { id: true, name: true, institutionName: true } }
          }
        },
        matchedProposal: {
          include: {
            researcher: { select: { name: true, institutionName: true } },
            researchResult: true
          }
        },
        resultingAgenda: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: needs
    });
  } catch (err) {
    console.error('Error getOpdNeeds:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar usulan kebutuhan riset.'
    });
  }
};

// =========================================================================
// 3. DETAIL USULAN KEBUTUHAN RISET DENGAN PELACAKAN STATUS BERJENJANG
// =========================================================================
const getOpdNeedById = async (req, res) => {
  try {
    const { id } = req.params;

    const need = await prisma.opdResearchNeed.findUnique({
      where: { id },
      include: {
        opdUser: {
          select: { id: true, name: true, institutionName: true, email: true, position: true }
        },
        curatorUser: {
          select: { id: true, name: true, role: true }
        },
        parentNeed: {
          select: {
            id: true,
            needCode: true,
            title: true,
            thematicArea: true,
            opdUser: { select: { id: true, name: true, institutionName: true } }
          }
        },
        clusteredNeeds: {
          include: {
            opdUser: { select: { id: true, name: true, institutionName: true } }
          }
        },
        matchedProposal: {
          include: {
            researcher: { select: { name: true, institutionName: true, email: true } },
            researchResult: true,
            policyRecommendations: true,
            dispositions: true
          }
        },
        resultingAgenda: {
          include: {
            proposals: {
              select: {
                id: true,
                proposalNumber: true,
                title: true,
                status: true,
                researcher: { select: { name: true, institutionName: true } }
              }
            }
          }
        }
      }
    });

    if (!need) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kebutuhan riset daerah tidak ditemukan.'
      });
    }

    // Role OPD hanya boleh melihat usulan dinasnya sendiri (kecuali jika berstatus konsorsium publik)
    if (req.user.role === 'OPD' && need.opdUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda hanya berhak melihat usulan kebutuhan dari dinas Anda sendiri.'
      });
    }

    return res.json({
      success: true,
      data: need
    });
  } catch (err) {
    console.error('Error getOpdNeedById:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat rincian usulan kebutuhan riset.'
    });
  }
};

// =========================================================================
// 4. LEMBAR KURASI, UJI ILMIAH & KONSOLIDASI MULTI-OPD OLEH BRIDA (Form 4.0.2)
// =========================================================================
const reviewOpdNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scientificFeasibility,
      rpjmdAlignment,
      priorityLevel,
      matchedPriorProposalId,
      clusterWithNeedId,
      curatorNotes,
      curationDecision
    } = req.body;

    const need = await prisma.opdResearchNeed.findUnique({
      where: { id }
    });

    if (!need) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kebutuhan riset tidak ditemukan.'
      });
    }

    if (!curatorNotes || curatorNotes.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Catatan ulasan telaah kritis kurator wajib diisi minimal 50 karakter.'
      });
    }

    if (!curationDecision) {
      return res.status(400).json({
        success: false,
        message: 'Putusan rekomendasi kurasi wajib dipilih.'
      });
    }

    let newStatus = need.status;
    let parentNeedId = need.parentNeedId;
    let matchedProposalId = need.matchedProposalId;

    if (curationDecision === 'RECOMMEND_NEW_AGENDA') {
      newStatus = 'VERIFIED';
    } else if (curationDecision === 'RECOMMEND_FAST_TRACK') {
      newStatus = 'VERIFIED';
      if (matchedPriorProposalId) {
        matchedProposalId = matchedPriorProposalId;
      }
    } else if (curationDecision === 'CLUSTER_WITH_EXISTING') {
      if (!clusterWithNeedId) {
        return res.status(400).json({
          success: false,
          message: 'Pilih usulan kebutuhan induk untuk menggabungkan ke dalam konsorsium tema riset.'
        });
      }
      newStatus = 'CLUSTERED_MULTI_OPD';
      parentNeedId = clusterWithNeedId;
    } else if (curationDecision === 'REQUEST_REVISION') {
      newStatus = 'REVISION_REQUESTED';
    } else if (curationDecision === 'REJECT_NOT_RESEARCH') {
      newStatus = 'REJECTED';
    }

    const isFeasible = scientificFeasibility === 'true' || scientificFeasibility === true;

    const updatedNeed = await prisma.opdResearchNeed.update({
      where: { id },
      data: {
        curatorId: req.user.id,
        scientificFeasibility: isFeasible,
        rpjmdAlignment: rpjmdAlignment ? rpjmdAlignment.trim() : null,
        priorityLevel: priorityLevel || 'STRATEGIS',
        curatorNotes: curatorNotes.trim(),
        reviewedAt: new Date(),
        status: newStatus,
        parentNeedId,
        matchedProposalId
      },
      include: {
        opdUser: true,
        curatorUser: true,
        parentNeed: true,
        matchedProposal: true
      }
    });

    // Catat Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'OPD_NEED_REVIEWED',
        details: `Kurator ${req.user.name} menelaah usulan ${need.needCode} dengan keputusan: ${curationDecision} (Status: ${newStatus})`
      }
    });

    return res.json({
      success: true,
      message: 'Ulasan kurasi dan kelayakan ilmiah berhasil disimpan.',
      data: updatedNeed
    });
  } catch (err) {
    console.error('Error reviewOpdNeed:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan ulasan kurasi kebutuhan riset.'
    });
  }
};

// =========================================================================
// 5. JALUR CEPAT: DISPOSISI FAST-TRACK NASKAH AKADEMIK TERDAHULU (Form 4.0.4)
// =========================================================================
const fastTrackAssign = async (req, res) => {
  try {
    const { id } = req.params;
    const { matchedProposalId, dispositionNumber, urgency, headAdoptionNotes } = req.body;

    const need = await prisma.opdResearchNeed.findUnique({
      where: { id },
      include: { opdUser: true }
    });

    if (!need) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kebutuhan riset tidak ditemukan.'
      });
    }

    if (!matchedProposalId) {
      return res.status(400).json({
        success: false,
        message: 'Pilih naskah riset/policy brief terdahulu dari bank data SIMRIDA.'
      });
    }

    if (!dispositionNumber || !dispositionNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nomor surat disposisi resmi Kepala BRIDA wajib diisi.'
      });
    }

    if (!headAdoptionNotes || headAdoptionNotes.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Instruksi dan arahan Kepala BRIDA perihal adopsi substansi naskah wajib diisi minimal 50 karakter.'
      });
    }

    // Periksa apakah proposal terdahulu valid dan memiliki naskah hasil
    const proposal = await prisma.researchProposal.findUnique({
      where: { id: matchedProposalId },
      include: { researchResult: true, policyRecommendations: true }
    });

    if (!proposal || !proposal.researchResult) {
      return res.status(400).json({
        success: false,
        message: 'Proposal riset terdahulu yang dipilih belum memiliki dokumen luaran laporan/policy brief.'
      });
    }

    // 1. Buat lembar disposisi resmi langsung ke akun Kepala OPD pemohon
    const newDisposition = await prisma.opdDisposition.create({
      data: {
        proposalId: matchedProposalId,
        opdUserId: need.opdUserId,
        dispositionNumber: dispositionNumber.trim(),
        dispositionSubject: `Adopsi Cepat (Fast-Track): Rekomendasi ${proposal.title} untuk kebutuhan ${need.title}`,
        urgency: urgency || 'SEGERA',
        notes: headAdoptionNotes.trim(),
        status: 'SENT',
        forwardedAt: new Date()
      }
    });

    // 2. Perbarui status usulan kebutuhan menjadi MATCHED_EXISTING_RESEARCH
    const updatedNeed = await prisma.opdResearchNeed.update({
      where: { id },
      data: {
        status: 'MATCHED_EXISTING_RESEARCH',
        matchedProposalId
      },
      include: {
        opdUser: true,
        matchedProposal: {
          include: { researchResult: true, researcher: true }
        }
      }
    });

    // 3. Catat Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        proposalId: matchedProposalId,
        action: 'FAST_TRACK_DISPOSITION_ISSUED',
        details: `Kepala BRIDA menetapkan Fast-Track naskah ${proposal.proposalNumber} kepada OPD ${need.opdUser.institutionName || need.opdUser.name} untuk kebutuhan ${need.needCode}`
      }
    });

    return res.json({
      success: true,
      message: 'Naskah akademik terdahulu berhasil didisposisikan langsung ke OPD melalui Jalur Cepat (Fast-Track).',
      data: {
        need: updatedNeed,
        disposition: newDisposition
      }
    });
  } catch (err) {
    console.error('Error fastTrackAssign:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengeksekusi penetapan naskah akademik terdahulu.'
    });
  }
};

// =========================================================================
// 6. TRANSFORMASI & PENERBITAN AGENDA RISET BARU (Call for Proposals - Form 4.0.3)
// =========================================================================
const convertToAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      field,
      targetYear,
      allocatedBudgetCeiling,
      submissionStartDate,
      submissionEndDate,
      description,
      isOpen
    } = req.body;

    const need = await prisma.opdResearchNeed.findUnique({
      where: { id },
      include: {
        opdUser: true,
        clusteredNeeds: { include: { opdUser: true } }
      }
    });

    if (!need) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kebutuhan riset tidak ditemukan.'
      });
    }

    if (!title || title.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Judul resmi Agenda Riset Daerah wajib diisi minimal 20 karakter.'
      });
    }

    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Bidang fokus riset resmi daerah wajib dipilih.'
      });
    }

    const cleanYear = parseInt(targetYear, 10) || need.targetYear;
    const budgetCeiling = parseFloat(allocatedBudgetCeiling);
    if (!budgetCeiling || isNaN(budgetCeiling) || budgetCeiling <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Batas pagu alokasi anggaran belanja riset (Rp) wajib bernilai positif.'
      });
    }

    // SINKRONISASI KAS INDUK: Pastikan pagu agenda tidak melebihi sisa kuota kas induk
    const fiscalCapacity = await checkAgendaFiscalCapacity(cleanYear, budgetCeiling);
    if (fiscalCapacity.isExceeded) {
      return res.status(400).json({
        success: false,
        message: `Pagu DPA agenda (Rp ${budgetCeiling.toLocaleString('id-ID')}) melebihi sisa alokasi kas induk Agenda Riset Daerah TA ${cleanYear}. Sisa kuota kas induk tersedia: Rp ${fiscalCapacity.availableQuota.toLocaleString('id-ID')} dari total pagu kas agenda Rp ${fiscalCapacity.budgetCap.agendaAllocation.toLocaleString('id-ID')} (Defisit: Rp ${fiscalCapacity.deficit.toLocaleString('id-ID')}). Silakan sesuaikan pagu agenda atau naikkan alokasi kas Agenda Daerah di modul Pagu Kas Induk.`
      });
    }

    if (!description || description.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Uraian kerangka acuan umum dan ekspektasi solusi wajib diisi minimal 100 karakter.'
      });
    }

    const isPublishOpen = isOpen === 'true' || isOpen === true || isOpen === '1';

    // Buat ResearchAgenda baru yang terikat pada originNeedId
    const newAgenda = await prisma.researchAgenda.create({
      data: {
        originNeedId: need.id,
        title: title.trim(),
        field: field.trim(),
        year: cleanYear,
        allocatedBudgetCeiling: budgetCeiling,
        description: description.trim(),
        startDate: submissionStartDate ? new Date(submissionStartDate) : new Date(),
        endDate: submissionEndDate ? new Date(submissionEndDate) : null,
        isOpen: isPublishOpen,
        createdById: req.user.id
      }
    });

    // Perbarui status usulan kebutuhan induk
    await prisma.opdResearchNeed.update({
      where: { id: need.id },
      data: {
        status: 'CONVERTED_TO_AGENDA'
      }
    });

    // Jika ada usulan kebutuhan anak (konsorsium), perbarui juga statusnya
    if (need.clusteredNeeds && need.clusteredNeeds.length > 0) {
      await prisma.opdResearchNeed.updateMany({
        where: { parentNeedId: need.id },
        data: {
          status: 'CONVERTED_TO_AGENDA'
        }
      });
    }

    // Catat Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'AGENDA_CREATED_FROM_NEED',
        details: `Kepala BRIDA mengesahkan Agenda Riset Daerah: ${title.trim()} (Pagu: Rp ${budgetCeiling.toLocaleString('id-ID')}) dari usulan ${need.needCode}`
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Agenda Riset Daerah resmi (Call for Proposals) berhasil diterbitkan ke katalog publik SIMRIDA.',
      data: newAgenda
    });
  } catch (err) {
    console.error('Error convertToAgenda:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menerbitkan Agenda Riset Daerah dari usulan kebutuhan OPD.'
    });
  }
};

// =========================================================================
// 7. HELPER: DAFTAR NASKAH RISET TERDAHULU UNTUK FAST-TRACK MATCHING
// =========================================================================
const getCompletedProposalsForFastTrack = async (req, res) => {
  try {
    const proposals = await prisma.researchProposal.findMany({
      where: {
        OR: [
          { status: 'RESULTS_SUBMITTED' },
          { status: 'FORWARDED_TO_OPD' },
          { status: 'COMPLETED' },
          { researchResult: { isNot: null } }
        ]
      },
      include: {
        researcher: { select: { id: true, name: true, institutionName: true } },
        researchResult: true,
        policyRecommendations: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: proposals
    });
  } catch (err) {
    console.error('Error getCompletedProposalsForFastTrack:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat bank data naskah riset terdahulu.'
    });
  }
};

// =========================================================================
// 8. PERBAIKAN / REVISI USULAN KEBUTUHAN OLEH OPD (Form 4.0.1 - Resubmit)
// =========================================================================
const updateOpdNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      thematicArea,
      urgencyBackground,
      expectedOutputs,
      targetRenjaIku,
      targetLocation,
      dataReadiness,
      dataAvailabilityNotes,
      targetYear,
      picName,
      picPhone
    } = req.body;

    const need = await prisma.opdResearchNeed.findUnique({
      where: { id }
    });

    if (!need) {
      return res.status(404).json({
        success: false,
        message: 'Data usulan kebutuhan riset tidak ditemukan.'
      });
    }

    // Role OPD hanya boleh mengedit usulan dinasnya sendiri
    if (req.user.role === 'OPD' && need.opdUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak berhak mengubah usulan dinas lain.'
      });
    }

    // Usulan hanya dapat diperbaiki jika berstatus REVISION_REQUESTED atau SUBMITTED
    if (!['REVISION_REQUESTED', 'SUBMITTED'].includes(need.status)) {
      return res.status(400).json({
        success: false,
        message: `Usulan kebutuhan berstatus ${need.status} tidak dapat diubah lagi.`
      });
    }

    // Validasi input
    if (title && title.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Judul rumusan kebutuhan riset wajib diisi minimal 20 karakter.'
      });
    }

    if (urgencyBackground && urgencyBackground.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Deskripsi permasalahan nyata di lapangan wajib diisi minimal 100 karakter.'
      });
    }

    if (targetRenjaIku && targetRenjaIku.trim().length < 30) {
      return res.status(400).json({
        success: false,
        message: 'Sasaran Program Renja dan IKU Kepala Dinas wajib diisi minimal 30 karakter.'
      });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (thematicArea) updateData.thematicArea = thematicArea.trim();
    if (urgencyBackground) updateData.urgencyBackground = urgencyBackground.trim();
    if (expectedOutputs) {
      updateData.expectedOutputs = typeof expectedOutputs === 'string' ? expectedOutputs : JSON.stringify(expectedOutputs);
    }
    if (targetRenjaIku) updateData.targetRenjaIku = targetRenjaIku.trim();
    if (targetLocation) updateData.targetLocation = targetLocation.trim();
    if (dataReadiness !== undefined) {
      updateData.dataReadiness = dataReadiness === 'true' || dataReadiness === true || dataReadiness === '1';
    }
    if (dataAvailabilityNotes !== undefined) {
      updateData.dataAvailabilityNotes = dataAvailabilityNotes ? dataAvailabilityNotes.trim() : null;
    }
    if (targetYear) {
      const cleanYear = parseInt(targetYear, 10);
      if (cleanYear >= 2024 && cleanYear <= 2035) {
        updateData.targetYear = cleanYear;
      }
    }
    if (picName) updateData.picName = picName.trim();
    if (picPhone) updateData.picPhone = picPhone.trim();

    if (req.file) {
      updateData.supportDocUrl = `/uploads/needs/${req.file.filename}`;
    }

    // Ubah status kembali ke SUBMITTED dan reset reviewedAt agar tim BRIDA dapat menelaah versi perbaikan
    updateData.status = 'SUBMITTED';
    updateData.reviewedAt = null;

    const updatedNeed = await prisma.opdResearchNeed.update({
      where: { id },
      data: updateData,
      include: { opdUser: true }
    });

    // Catat Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'OPD_NEED_REVISED_AND_RESUBMITTED',
        details: `OPD ${req.user.name} menyerahkan berkas perbaikan usulan kebutuhan ${need.needCode}`
      }
    });

    return res.json({
      success: true,
      message: 'Berkas perbaikan usulan kebutuhan riset berhasil diserahkan kembali ke BRIDA.',
      data: updatedNeed
    });
  } catch (err) {
    console.error('Error updateOpdNeed:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan perbaikan usulan kebutuhan riset.'
    });
  }
};

module.exports = {
  createOpdNeed,
  getOpdNeeds,
  getOpdNeedById,
  reviewOpdNeed,
  fastTrackAssign,
  convertToAgenda,
  getCompletedProposalsForFastTrack,
  updateOpdNeed
};

