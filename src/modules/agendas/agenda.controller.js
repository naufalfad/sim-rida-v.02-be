const prisma = require('../../prisma');
const { notifyRole } = require('../notifications/notification.service');

const WINNER_STATUSES = [
  'APPROVED',
  'CONTRACT_ISSUED',
  'CONTRACT_SIGNED',
  'RESULTS_SUBMITTED',
  'RESULTS_REVISION',
  'RESULTS_APPROVED',
  'FORWARDED_TO_OPD',
  'COMPLETED'
];

const DISBURSED_STATUSES = [
  'RESULTS_APPROVED',
  'FORWARDED_TO_OPD',
  'COMPLETED'
];

/**
 * 1. Daftar Katalog Agenda Riset Daerah (Call for Proposals)
 * Mendukung filter tahun, status publikasi (isOpen), dan bidang kajian
 */
const listAgendas = async (req, res) => {
  try {
    // Jalankan pemeriksaan otomatis agenda yang melewati tenggat waktu
    await checkAndProcessExpiredAgendas();

    const { year, isOpen, field, search } = req.query;
    const filter = {};

    if (year && year !== 'ALL') filter.year = parseInt(year, 10);
    if (isOpen !== undefined && isOpen !== 'ALL') filter.isOpen = isOpen === 'true';
    if (field && field !== 'ALL') filter.field = field;

    if (search && search.trim()) {
      filter.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { field: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const agendas = await prisma.researchAgenda.findMany({
      where: filter,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true, institutionName: true }
        },
        originNeed: {
          select: {
            id: true,
            needCode: true,
            title: true,
            thematicArea: true,
            opdUser: {
              select: { id: true, name: true, institutionName: true }
            }
          }
        },
        proposals: {
          select: {
            id: true,
            proposalNumber: true,
            title: true,
            status: true,
            submittedAt: true,
            proposedBudget: true,
            headApprovedBudget: true,
            contractDocument: {
              select: { contractValue: true, isSigned: true }
            },
            researcher: {
              select: { id: true, name: true, institutionName: true }
            }
          }
        },
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedAgendas = agendas.map((agenda) => {
      const ceiling = agenda.allocatedBudgetCeiling || 0;
      const approvedAwardees = (agenda.proposals || []).filter((p) => WINNER_STATUSES.includes(p.status));
      const committedDpaBudget = approvedAwardees.reduce(
        (acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
        0
      );
      const disbursedDpaBudget = approvedAwardees
        .filter((p) => DISBURSED_STATUSES.includes(p.status))
        .reduce((acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);
      const remainingDpaBudget = Math.max(0, ceiling - committedDpaBudget);
      const dpaAbsorptionPercent = ceiling > 0 ? Number(((committedDpaBudget / ceiling) * 100).toFixed(1)) : 0;
      const realDisbursedPercent = ceiling > 0 ? Number(((disbursedDpaBudget / ceiling) * 100).toFixed(1)) : 0;

      // Status efisiensi dana mengendap (De-encumbrance)
      const isReleased = !agenda.isOpen;
      const releasedAmount = isReleased ? remainingDpaBudget : 0;
      const effectiveEncumbrance = agenda.isOpen ? ceiling : committedDpaBudget;

      return {
        ...agenda,
        dpaSummary: {
          allocatedBudgetCeiling: ceiling,
          committedDpaBudget,
          disbursedDpaBudget,
          remainingDpaBudget,
          dpaAbsorptionPercent,
          realDisbursedPercent,
          approvedAwardeesCount: approvedAwardees.length,
          canApproveMore: remainingDpaBudget > 0,
          hasRemainingQuota: remainingDpaBudget > 0,
          isReleased,
          releasedAmount,
          effectiveEncumbrance
        }
      };
    });

    return res.json({
      success: true,
      data: enrichedAgendas
    });
  } catch (err) {
    console.error('List agendas error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat katalog agenda riset daerah.' });
  }
};

/**
 * 2. Detail Agenda Riset Prioritas Daerah
 */
const getAgendaById = async (req, res) => {
  try {
    const { id } = req.params;

    const agenda = await prisma.researchAgenda.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true, institutionName: true }
        },
        originNeed: {
          select: {
            id: true,
            needCode: true,
            title: true,
            thematicArea: true,
            urgencyBackground: true,
            targetRenjaIku: true,
            targetLocation: true,
            picName: true,
            picPhone: true,
            opdUser: {
              select: { id: true, name: true, institutionName: true, email: true }
            }
          }
        },
        proposals: {
          include: {
            researcher: {
              select: { id: true, name: true, institutionName: true, email: true, phone: true }
            },
            contractDocument: {
              select: { contractNumber: true, contractValue: true, isSigned: true }
            }
          },
          orderBy: { submittedAt: 'desc' }
        },
        _count: {
          select: { proposals: true }
        }
      }
    });

    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda riset daerah tidak ditemukan.'
      });
    }

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

    const disbursedStatuses = [
      'RESULTS_APPROVED',
      'FORWARDED_TO_OPD',
      'COMPLETED'
    ];

    const ceiling = agenda.allocatedBudgetCeiling || 0;
    const approvedAwardees = (agenda.proposals || []).filter((p) => winnerStatuses.includes(p.status));
    const committedDpaBudget = approvedAwardees.reduce(
      (acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
      0
    );
    const disbursedDpaBudget = approvedAwardees
      .filter((p) => disbursedStatuses.includes(p.status))
      .reduce((acc, p) => acc + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);
    const remainingDpaBudget = Math.max(0, ceiling - committedDpaBudget);
    const dpaAbsorptionPercent = ceiling > 0 ? Number(((committedDpaBudget / ceiling) * 100).toFixed(1)) : 0;
    const realDisbursedPercent = ceiling > 0 ? Number(((disbursedDpaBudget / ceiling) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      data: {
        ...agenda,
        dpaSummary: {
          allocatedBudgetCeiling: ceiling,
          committedDpaBudget,
          disbursedDpaBudget,
          remainingDpaBudget,
          dpaAbsorptionPercent,
          realDisbursedPercent,
          approvedAwardeesCount: approvedAwardees.length,
          canApproveMore: remainingDpaBudget > 0,
          hasRemainingQuota: remainingDpaBudget > 0
        }
      }
    });
  } catch (err) {
    console.error('Get agenda by id error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail agenda riset.' });
  }
};

/**
 * Helper: Memeriksa dan memproses agenda yang telah melewati batas waktu (expired)
 * atau mendekati masa tenggat (H-3 peringatan ke Kepala BRIDA).
 * Agenda yang expired otomatis ditutup dan sisa pagunya dirilis ke Kas Induk.
 */
const checkAndProcessExpiredAgendas = async () => {
  try {
    const now = new Date();

    // 1. Agenda yang telah lewat endDate dan statusnya masih isOpen
    const expiredAgendas = await prisma.researchAgenda.findMany({
      where: {
        isOpen: true,
        endDate: { lt: now }
      },
      include: {
        proposals: {
          select: {
            status: true,
            proposedBudget: true,
            headApprovedBudget: true,
            contractDocument: { select: { contractValue: true } }
          }
        }
      }
    });

    for (const ag of expiredAgendas) {
      const committed = (ag.proposals || [])
        .filter(p => WINNER_STATUSES.includes(p.status))
        .reduce((sum, p) => sum + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);
      const ceiling = ag.allocatedBudgetCeiling || 0;
      const unspent = Math.max(0, ceiling - committed);

      await prisma.researchAgenda.update({
        where: { id: ag.id },
        data: { isOpen: false }
      });

      await prisma.auditLog.create({
        data: {
          action: 'RESEARCH_AGENDA_AUTO_CLOSED',
          details: `Agenda Riset "${ag.title}" (TA ${ag.year}) ditutup otomatis oleh sistem karena melewati tenggat penutupan proposal (${ag.endDate?.toISOString().split('T')[0] || '-'}). Pagu DPA awal Rp ${ceiling.toLocaleString('id-ID')}, realisasi kontrak Rp ${committed.toLocaleString('id-ID')}. Sisa pagu mengendap Rp ${unspent.toLocaleString('id-ID')} resmi dirilis kembali ke Kas Induk.`
        }
      });

      notifyRole('KEPALA_BRIDA', {
        title: 'Agenda Riset Ditutup Otomatis & Sisa Pagu Dirilis',
        message: `Masa Call for Proposals Agenda "${ag.title}" telah berakhir. Sistem telah menutup agenda dan merilis sisa pagu sebesar Rp ${unspent.toLocaleString('id-ID')} kembali ke Kas Induk TA ${ag.year}.`,
        type: 'INFO',
        link: '/agenda'
      }).catch(e => console.error('notifyRole auto-close error:', e));
    }

    // 2. Agenda yang mendekati tenggat dalam 3 hari ke depan (Peringatan H-3 ke Kepala BRIDA)
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nearExpiryAgendas = await prisma.researchAgenda.findMany({
      where: {
        isOpen: true,
        endDate: { gte: now, lte: threeDaysAhead }
      }
    });

    for (const ag of nearExpiryAgendas) {
      const recentNotif = await prisma.notification.findFirst({
        where: {
          title: 'Peringatan: Masa Pendaftaran Agenda Segera Berakhir',
          message: { contains: ag.title },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!recentNotif) {
        notifyRole('KEPALA_BRIDA', {
          title: 'Peringatan: Masa Pendaftaran Agenda Segera Berakhir',
          message: `Agenda "${ag.title}" akan berakhir pada ${ag.endDate?.toLocaleDateString('id-ID') || '-'}. Kepala BRIDA dapat menutup agenda lebih awal jika seleksi tuntas guna merilis sisa pagu ke Kas Induk, atau memperpanjang jadwal jika dibutuhkan.`,
          type: 'WARNING',
          link: '/agenda'
        }).catch(e => console.error('notifyRole warning error:', e));
      }
    }
  } catch (err) {
    console.error('checkAndProcessExpiredAgendas error:', err);
  }
};

/**
 * Helper: Memeriksa kapasitas fiskal kas induk Agenda Daerah (FiscalBudgetCap.agendaAllocation)
 * Menjamin tidak terjadi over-budgeting dan mendukung pelepasan sisa dana agenda yang ditutup.
 */
const checkAgendaFiscalCapacity = async (year, requestedCeiling = 0, excludeAgendaId = null) => {
  const cleanYear = parseInt(year, 10);

  // 0. Auto-check agenda kedaluwarsa & rilis sisa pagu mengendap
  await checkAndProcessExpiredAgendas();

  // 1. Ambil atau buat konfigurasi pagu kas induk jika belum ada
  let budgetCap = await prisma.fiscalBudgetCap.findUnique({
    where: { fiscalYear: cleanYear }
  });

  if (!budgetCap) {
    budgetCap = await prisma.fiscalBudgetCap.create({
      data: {
        fiscalYear: cleanYear,
        fundingSource: 'CAMPURAN',
        totalBudgetCap: 1500000000,
        agendaAllocation: 750000000,
        initiativeAllocation: 750000000,
        notes: `Plafon pagu kas induk belanja litbangda TA ${cleanYear} (Baseline Otomatis SIMRIDA).`
      }
    });
  }

  // 2. Hitung komitmen riil agenda-agenda pada tahun anggaran tersebut
  const agendaFilter = { year: cleanYear };
  if (excludeAgendaId) {
    agendaFilter.id = { not: excludeAgendaId };
  }

  const existingAgendas = await prisma.researchAgenda.findMany({
    where: agendaFilter,
    include: {
      proposals: {
        select: {
          status: true,
          proposedBudget: true,
          headApprovedBudget: true,
          contractDocument: { select: { contractValue: true } }
        }
      }
    }
  });

  let totalPublishedCeiling = 0;
  let effectiveAllocated = 0;
  let totalReleased = 0;

  existingAgendas.forEach((ag) => {
    const ceiling = ag.allocatedBudgetCeiling || 0;
    totalPublishedCeiling += ceiling;

    const agCommitted = (ag.proposals || [])
      .filter((p) => WINNER_STATUSES.includes(p.status))
      .reduce((sum, p) => sum + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);

    if (ag.isOpen) {
      // Jika masih buka pendaftaran, kunci sebesar pagu DPA penuh untuk lindungi calon pelamar
      effectiveAllocated += ceiling;
    } else {
      // Jika telah ditutup, kunci HANYA sebesar realisasi proposal yang berkontrak/sah!
      effectiveAllocated += agCommitted;
      totalReleased += Math.max(0, ceiling - agCommitted);
    }
  });

  const availableQuota = Math.max(0, budgetCap.agendaAllocation - effectiveAllocated);
  const isExceeded = requestedCeiling > availableQuota;
  const deficit = isExceeded ? requestedCeiling - availableQuota : 0;

  return {
    year: cleanYear,
    budgetCap: {
      totalBudgetCap: budgetCap.totalBudgetCap,
      agendaAllocation: budgetCap.agendaAllocation,
      initiativeAllocation: budgetCap.initiativeAllocation,
      fundingSource: budgetCap.fundingSource
    },
    existingAgendasCount: existingAgendas.length,
    existingAllocated: totalPublishedCeiling,
    effectiveAllocated,
    totalReleased,
    availableQuota,
    requestedCeiling,
    isExceeded,
    deficit
  };
};

/**
 * Controller endpoint: GET /api/agendas/fiscal-check?year=2026&excludeId=...
 */
const checkFiscalQuota = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const excludeId = req.query.excludeId || null;
    const capacity = await checkAgendaFiscalCapacity(year, 0, excludeId);

    return res.json({
      success: true,
      data: capacity
    });
  } catch (err) {
    console.error('checkFiscalQuota error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa kapasitas kuota fiskal kas agenda.'
    });
  }
};

/**
 * 3. Penerbitan & Pengesahan Agenda Riset Baru (Blueprint Bab 4.0.3 / Form 0C.1)
 * Aktor: KEPALA_BRIDA / STAF_BRIDA
 */
const createAgenda = async (req, res) => {
  try {
    const {
      year,
      targetYear,
      title,
      field,
      allocatedBudgetCeiling,
      submissionStartDate,
      startDate,
      submissionEndDate,
      endDate,
      description,
      originNeedId,
      isOpen
    } = req.body;

    // Validasi Form
    if (!title || title.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Judul resmi Agenda Riset Daerah wajib diisi minimal 20 karakter.'
      });
    }

    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Bidang fokus kajian riset resmi daerah wajib dipilih.'
      });
    }

    const cleanYear = parseInt(year || targetYear, 10);
    if (!cleanYear || isNaN(cleanYear) || cleanYear < 2024 || cleanYear > 2035) {
      return res.status(400).json({
        success: false,
        message: 'Tahun Anggaran pelaksanaan riset harus berformat 4 digit tahun (contoh: 2027).'
      });
    }

    const budgetCeiling = parseFloat(allocatedBudgetCeiling);
    if (!budgetCeiling || isNaN(budgetCeiling) || budgetCeiling <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Batas pagu alokasi belanja riset DPA BRIDA (Rp) wajib bernilai positif.'
      });
    }

    // =========================================================================
    // SINKRONISASI & KONTROL FISKAL KAS INDUK (Pagu Agenda <= Kuota Kas Induk)
    // =========================================================================
    const fiscalCapacity = await checkAgendaFiscalCapacity(cleanYear, budgetCeiling);
    if (fiscalCapacity.isExceeded) {
      return res.status(400).json({
        success: false,
        message: `Pagu DPA agenda (Rp ${budgetCeiling.toLocaleString('id-ID')}) melebihi sisa alokasi kas induk Agenda Daerah TA ${cleanYear}. Sisa kuota kas induk tersedia: Rp ${fiscalCapacity.availableQuota.toLocaleString('id-ID')} dari total alokasi Rp ${fiscalCapacity.budgetCap.agendaAllocation.toLocaleString('id-ID')} (Defisit: Rp ${fiscalCapacity.deficit.toLocaleString('id-ID')}). Silakan sesuaikan pagu agenda atau naikkan alokasi kas Agenda Daerah di modul Pagu Kas Induk.`
      });
    }

    if (!description || description.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Uraian kerangka acuan kerja (KAK) dan ekspektasi solusi wajib diisi minimal 100 karakter.'
      });
    }

    const start = submissionStartDate || startDate ? new Date(submissionStartDate || startDate) : new Date();
    const end = submissionEndDate || endDate ? new Date(submissionEndDate || endDate) : null;

    if (end && start && end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Batas akhir penutupan pengajuan proposal harus setelah tanggal pembukaan.'
      });
    }

    const isPublishOpen = isOpen === true || isOpen === 'true' || isOpen === '1' || isOpen === undefined;

    // Simpan agenda baru
    const newAgenda = await prisma.researchAgenda.create({
      data: {
        year: cleanYear,
        title: title.trim(),
        field: field.trim(),
        allocatedBudgetCeiling: budgetCeiling,
        description: description.trim(),
        startDate: start,
        endDate: end,
        isOpen: isPublishOpen,
        originNeedId: originNeedId || null,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, institutionName: true }
        },
        originNeed: {
          select: { id: true, needCode: true, title: true }
        }
      }
    });

    // Jika agenda ini dikaitkan dengan usulan kebutuhan OPD hulu, perbarui status usulan
    if (originNeedId) {
      await prisma.opdResearchNeed.update({
        where: { id: originNeedId },
        data: { status: 'CONVERTED_TO_AGENDA' }
      });
    }

    // Catat Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RESEARCH_AGENDA_PUBLISHED',
        details: `${req.user.name} (${req.user.role}) menerbitkan Agenda Riset Daerah: "${title.trim()}" (Pagu: Rp ${budgetCeiling.toLocaleString('id-ID')})`
      }
    });

    // Notifikasi ke seluruh Peneliti bahwa agenda riset baru telah dibuka
    notifyRole('PENELITI', {
      title: 'Agenda Riset Daerah Baru Dibuka!',
      message: `BRIDA membuka Agenda Riset: "${title.trim()}" (Pagu: Rp ${budgetCeiling.toLocaleString('id-ID')}). Pengajuan proposal kompetitif telah dibuka.`,
      type: 'INFO',
      link: `/agenda`
    }).catch(e => console.error('Notify Peneliti new agenda error:', e));

    return res.status(201).json({
      success: true,
      message: 'Agenda prioritas riset daerah resmi (Call for Proposals) berhasil diterbitkan ke katalog publik.',
      data: newAgenda
    });
  } catch (err) {
    console.error('Create agenda error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat agenda riset daerah.' });
  }
};

/**
 * 4. Pembaruan Status / Pengaturan Agenda Riset Daerah (Edit / Toggle Open)
 * Aktor: KEPALA_BRIDA / STAF_BRIDA
 */
const updateAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      year,
      title,
      field,
      allocatedBudgetCeiling,
      submissionStartDate,
      submissionEndDate,
      description,
      isOpen
    } = req.body;

    const existingAgenda = await prisma.researchAgenda.findUnique({
      where: { id },
      include: {
        proposals: {
          select: {
            status: true,
            proposedBudget: true,
            headApprovedBudget: true,
            contractDocument: { select: { contractValue: true } }
          }
        }
      }
    });

    if (!existingAgenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda riset tidak ditemukan.'
      });
    }

    // Hitung komitmen riil riset yang sudah berjalan pada agenda ini
    const committedDpaBudget = (existingAgenda.proposals || [])
      .filter((p) => WINNER_STATUSES.includes(p.status))
      .reduce(
        (sum, p) => sum + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0),
        0
      );

    const updateData = {};
    if (year) updateData.year = parseInt(year, 10);
    if (title && title.trim().length >= 20) updateData.title = title.trim();
    if (field) updateData.field = field.trim();
    if (allocatedBudgetCeiling !== undefined) {
      const budget = parseFloat(allocatedBudgetCeiling);
      if (budget <= 0 || isNaN(budget)) {
        return res.status(400).json({
          success: false,
          message: 'Pagu alokasi belanja riset DPA BRIDA wajib berupa angka positif.'
        });
      }
      if (budget < committedDpaBudget) {
        return res.status(400).json({
          success: false,
          message: `Pagu alokasi agenda tidak dapat diturunkan menjadi Rp ${budget.toLocaleString('id-ID')}, karena telah terdapat komitmen kontrak riset berjalan sebesar Rp ${committedDpaBudget.toLocaleString('id-ID')}.`
        });
      }
      updateData.allocatedBudgetCeiling = budget;
    }

    // SINKRONISASI KAS INDUK jika ada perubahan tahun atau pagu
    if (allocatedBudgetCeiling !== undefined || year !== undefined) {
      const targetYear = updateData.year || existingAgenda.year;
      const targetCeiling = updateData.allocatedBudgetCeiling !== undefined
        ? updateData.allocatedBudgetCeiling
        : (existingAgenda.allocatedBudgetCeiling || 0);

      if (targetCeiling > 0) {
        const fiscalCapacity = await checkAgendaFiscalCapacity(targetYear, targetCeiling, id);
        if (fiscalCapacity.isExceeded) {
          return res.status(400).json({
            success: false,
            message: `Pagu DPA agenda (Rp ${targetCeiling.toLocaleString('id-ID')}) melebihi sisa alokasi kas induk Agenda Daerah TA ${targetYear}. Sisa kuota kas induk tersedia: Rp ${fiscalCapacity.availableQuota.toLocaleString('id-ID')} (Defisit: Rp ${fiscalCapacity.deficit.toLocaleString('id-ID')}).`
          });
        }
      }
    }
    if (submissionStartDate) updateData.startDate = new Date(submissionStartDate);
    if (submissionEndDate) updateData.endDate = new Date(submissionEndDate);
    if (description && description.trim().length >= 50) updateData.description = description.trim();
    if (isOpen !== undefined) {
      updateData.isOpen = isOpen === true || isOpen === 'true' || isOpen === '1';
    }

    const updated = await prisma.researchAgenda.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: true,
        originNeed: true,
        _count: { select: { proposals: true } }
      }
    });

    // Catat Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RESEARCH_AGENDA_UPDATED',
        details: `${req.user.name} memperbarui Agenda Riset: ${updated.title} (Pagu DPA: Rp ${Number(updated.allocatedBudgetCeiling || 0).toLocaleString('id-ID')}, Status Buka: ${updated.isOpen ? 'BUKA' : 'TUTUP'})`
      }
    });

    return res.json({
      success: true,
      message: 'Agenda riset daerah berhasil diperbarui.',
      data: updated
    });
  } catch (err) {
    console.error('Update agenda error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui agenda riset.' });
  }
};

/**
 * 5. Hapus Agenda Riset (Hanya jika belum ada proposal peneliti yang masuk)
 */
const deleteAgenda = async (req, res) => {
  try {
    const { id } = req.params;

    const agenda = await prisma.researchAgenda.findUnique({
      where: { id },
      include: { _count: { select: { proposals: true } } }
    });

    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda riset tidak ditemukan.'
      });
    }

    if (agenda._count.proposals > 0) {
      return res.status(400).json({
        success: false,
        message: `Tidak dapat menghapus agenda riset ini karena sudah terdapat ${agenda._count.proposals} usulan proposal peneliti yang terdaftar.`
      });
    }

    await prisma.researchAgenda.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RESEARCH_AGENDA_DELETED',
        details: `${req.user.name} menghapus Agenda Riset: ${agenda.title}`
      }
    });

    return res.json({
      success: true,
      message: 'Agenda riset daerah berhasil dihapus.'
    });
  } catch (err) {
    console.error('Delete agenda error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus agenda riset.' });
  }
};

/**
 * 6. Otoritas Kepala BRIDA: Menutup Agenda & Merilis Sisa Pagu Mengendap ke Kas Induk
 * POST /api/agendas/:id/close-and-release
 */
const closeAndReleaseAgenda = async (req, res) => {
  try {
    const { id } = req.params;

    const agenda = await prisma.researchAgenda.findUnique({
      where: { id },
      include: {
        proposals: {
          select: {
            id: true,
            status: true,
            proposedBudget: true,
            headApprovedBudget: true,
            contractDocument: { select: { contractValue: true } }
          }
        }
      }
    });

    if (!agenda) {
      return res.status(404).json({ success: false, message: 'Agenda riset tidak ditemukan.' });
    }

    if (!agenda.isOpen) {
      return res.status(400).json({ success: false, message: 'Agenda ini sudah dalam status ditutup.' });
    }

    const ceiling = agenda.allocatedBudgetCeiling || 0;
    const committed = (agenda.proposals || [])
      .filter(p => WINNER_STATUSES.includes(p.status))
      .reduce((sum, p) => sum + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);
    const unspent = Math.max(0, ceiling - committed);

    const updated = await prisma.researchAgenda.update({
      where: { id },
      data: { isOpen: false }
    });

    // Catat Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RESEARCH_AGENDA_CLOSED_AND_RELEASED',
        details: `${req.user.name} (${req.user.role}) menutup Agenda "${agenda.title}" (TA ${agenda.year}). Pagu DPA awal Rp ${ceiling.toLocaleString('id-ID')}, realisasi kontrak Rp ${committed.toLocaleString('id-ID')}. Sisa pagu mengendap Rp ${unspent.toLocaleString('id-ID')} resmi dirilis kembali ke Kas Induk Litbangda.`
      }
    });

    // Notifikasi
    await notifyRole('KEPALA_BRIDA', {
      title: 'Agenda Riset Ditutup & Sisa Pagu Dirilis',
      message: `Agenda "${agenda.title}" telah ditutup. Sisa anggaran sebesar Rp ${unspent.toLocaleString('id-ID')} telah dirilis kembali ke Kas Induk TA ${agenda.year} dan siap dialokasikan untuk agenda prioritas lainnya.`,
      type: 'SUCCESS',
      link: '/agenda'
    }).catch(e => console.error('notifyRole closeAndRelease error:', e));

    return res.json({
      success: true,
      message: `Agenda resmi ditutup. Sisa pagu efisiensi sebesar Rp ${unspent.toLocaleString('id-ID')} telah dikembalikan ke Kas Induk Litbangda TA ${agenda.year}.`,
      data: {
        agenda: updated,
        allocatedBudgetCeiling: ceiling,
        committedAmount: committed,
        releasedAmount: unspent
      }
    });
  } catch (err) {
    console.error('closeAndReleaseAgenda error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menutup agenda dan merilis sisa pagu.' });
  }
};

module.exports = {
  listAgendas,
  getAgendaById,
  checkFiscalQuota,
  checkAgendaFiscalCapacity,
  checkAndProcessExpiredAgendas,
  createAgenda,
  updateAgenda,
  deleteAgenda,
  closeAndReleaseAgenda
};
