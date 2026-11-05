const prisma = require('../../prisma');
const { checkAndProcessExpiredAgendas } = require('../agendas/agenda.controller');

/**
 * 1. AMBIL INFORMASI PAGU FISKAL KAS BRIDA TAHUN BERJALAN (Lengkap dengan Metrik Real-time Serapan)
 */
const getCurrentFiscalBudget = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    // Auto-check agenda kedaluwarsa & rilis sisa pagu mengendap
    if (checkAndProcessExpiredAgendas) {
      await checkAndProcessExpiredAgendas();
    }

    // 1. Ambil atau buat konfigurasi pagu jika belum ada
    let budgetCap = await prisma.fiscalBudgetCap.findUnique({
      where: { fiscalYear: year },
      include: {
        createdBy: { select: { name: true, position: true } }
      }
    });

    if (!budgetCap) {
      // Buat default baseline jika belum diatur oleh Kepala BRIDA
      budgetCap = await prisma.fiscalBudgetCap.create({
        data: {
          fiscalYear: year,
          fundingSource: 'CAMPURAN', // APBD + APBN
          totalBudgetCap: 1500000000, // Rp 1.500.000.000 (1,5 M)
          agendaAllocation: 750000000, // Rp 750.000.000
          initiativeAllocation: 750000000, // Rp 750.000.000
          notes: `Plafon pagu kas induk belanja litbangda TA ${year} Pemerintah Kabupaten Mimika (Kombinasi DPA APBD & Dana Transfer APBN/BRIN).`,
          createdById: req.user.id
        },
        include: {
          createdBy: { select: { name: true, position: true } }
        }
      });
    }

    // 2. Ambil seluruh proposal pada tahun anggaran tersebut untuk menghitung serapan riil
    const proposals = await prisma.researchProposal.findMany({
      where: {
        submittedAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`)
        }
      },
      select: {
        id: true,
        proposalNumber: true,
        title: true,
        submissionType: true,
        status: true,
        proposedBudget: true,
        submittedAt: true,
        contractDocument: {
          select: { contractNumber: true, contractValue: true, isSigned: true }
        },
        researcher: {
          select: { name: true, institutionName: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // 2b. Ambil seluruh Agenda Riset Daerah beserta proposal pada tahun anggaran tersebut
    const existingAgendas = await prisma.researchAgenda.findMany({
      where: { year },
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

    // 1. Kategori status yang mengunci komitmen kas (Riset Aktif Berjalan / Masa Uji Naskah)
    const committedStatuses = [
      'APPROVED',
      'CONTRACT_ISSUED',
      'CONTRACT_SIGNED',
      'RESULTS_SUBMITTED',
      'RESULTS_REVISION'
    ];

    // 2. Kategori status yang telah disahkan naskah akademiknya oleh Kepala BRIDA (Kas Terserap Riil 100%)
    const disbursedStatuses = [
      'RESULTS_APPROVED',
      'FORWARDED_TO_OPD',
      'COMPLETED'
    ];

    let totalCommittedOnly = 0;
    let totalDisbursed = 0;
    let agendaCommittedOnly = 0;
    let agendaDisbursed = 0;
    let initiativeCommittedOnly = 0;
    let initiativeDisbursed = 0;

    const contractedList = [];
    const inPipelineList = [];

    proposals.forEach((p) => {
      const effectiveAmount = p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0;
      const isCommittedOnly = committedStatuses.includes(p.status);
      const isDisbursed = disbursedStatuses.includes(p.status);
      const isLocked = isCommittedOnly || isDisbursed;

      if (isLocked) {
        if (isDisbursed) {
          totalDisbursed += effectiveAmount;
          if (p.submissionType === 'AGENDA_COMPETITIVE') {
            agendaDisbursed += effectiveAmount;
          } else {
            initiativeDisbursed += effectiveAmount;
          }
        } else {
          totalCommittedOnly += effectiveAmount;
          if (p.submissionType === 'AGENDA_COMPETITIVE') {
            agendaCommittedOnly += effectiveAmount;
          } else {
            initiativeCommittedOnly += effectiveAmount;
          }
        }

        contractedList.push({
          id: p.id,
          proposalNumber: p.proposalNumber,
          title: p.title,
          submissionType: p.submissionType,
          status: p.status,
          isDisbursed,
          amount: effectiveAmount,
          contractNumber: p.contractDocument?.contractNumber || null,
          researcherName: p.researcher?.name || '-',
          institutionName: p.researcher?.institutionName || '-'
        });
      } else if (!p.status.startsWith('REJECTED_')) {
        inPipelineList.push({
          id: p.id,
          proposalNumber: p.proposalNumber,
          title: p.title,
          submissionType: p.submissionType,
          status: p.status,
          amount: effectiveAmount,
          researcherName: p.researcher?.name || '-',
          institutionName: p.researcher?.institutionName || '-'
        });
      }
    });

    const totalLocked = totalCommittedOnly + totalDisbursed;
    const agendaLocked = agendaCommittedOnly + agendaDisbursed;
    const initiativeLocked = initiativeCommittedOnly + initiativeDisbursed;

    // SINKRONISASI KAS CERDAS:
    // Agenda BUKA mengunci pagu DPA penuh untuk proteksi pelamar.
    // Agenda DITUTUP hanya mengunci nilai proposal yang berkontrak/sah, sisa pagu mengendap otomatis dirilis kembali ke Kas Induk!
    let totalPublishedCeiling = 0;
    let agendaCommittedCeiling = 0;
    let totalReleasedBudget = 0;

    existingAgendas.forEach((ag) => {
      const ceiling = ag.allocatedBudgetCeiling || 0;
      totalPublishedCeiling += ceiling;

      const agCommitted = (ag.proposals || [])
        .filter((p) => committedStatuses.includes(p.status) || disbursedStatuses.includes(p.status))
        .reduce((sum, p) => sum + (p.contractDocument?.contractValue || p.headApprovedBudget || p.proposedBudget || 0), 0);

      if (ag.isOpen) {
        agendaCommittedCeiling += ceiling;
      } else {
        agendaCommittedCeiling += agCommitted;
        totalReleasedBudget += Math.max(0, ceiling - agCommitted);
      }
    });

    const remainingAgenda = Math.max(0, budgetCap.agendaAllocation - agendaCommittedCeiling);
    const remainingInitiative = Math.max(0, budgetCap.initiativeAllocation - initiativeLocked);
    const remainingTotal = remainingAgenda + remainingInitiative;

    const totalAbsorptionPercent = budgetCap.totalBudgetCap > 0
      ? Number((((agendaCommittedCeiling + initiativeLocked) / budgetCap.totalBudgetCap) * 100).toFixed(1))
      : 0;

    const realDisbursedPercent = budgetCap.totalBudgetCap > 0
      ? Number(((totalDisbursed / budgetCap.totalBudgetCap) * 100).toFixed(1))
      : 0;

    const activeCommittedPercent = budgetCap.totalBudgetCap > 0
      ? Number(((totalCommittedOnly / budgetCap.totalBudgetCap) * 100).toFixed(1))
      : 0;

    const agendaAbsorptionPercent = budgetCap.agendaAllocation > 0
      ? Number(((agendaCommittedCeiling / budgetCap.agendaAllocation) * 100).toFixed(1))
      : 0;

    const initiativeAbsorptionPercent = budgetCap.initiativeAllocation > 0
      ? Number(((initiativeLocked / budgetCap.initiativeAllocation) * 100).toFixed(1))
      : 0;

    return res.json({
      success: true,
      data: {
        budgetCap: {
          id: budgetCap.id,
          fiscalYear: budgetCap.fiscalYear,
          fundingSource: budgetCap.fundingSource,
          totalBudgetCap: budgetCap.totalBudgetCap,
          agendaAllocation: budgetCap.agendaAllocation,
          initiativeAllocation: budgetCap.initiativeAllocation,
          notes: budgetCap.notes,
          createdBy: budgetCap.createdBy?.name || 'Kepala BRIDA',
          updatedAt: budgetCap.updatedAt
        },
        metrics: {
          totalContracted: totalLocked, // backward compatibility
          totalLocked,
          totalCommitted: totalCommittedOnly,
          totalDisbursed,
          agendaContracted: agendaLocked,
          agendaCommitted: agendaCommittedOnly,
          agendaDisbursed,
          agendaPublishedCeiling: totalPublishedCeiling,
          agendaCount: existingAgendas.length,
          agendaCommittedCeiling,
          totalReleasedBudget,
          initiativeContracted: initiativeLocked,
          initiativeCommitted: initiativeCommittedOnly,
          initiativeDisbursed,
          remainingTotal,
          remainingAgenda,
          remainingInitiative,
          totalAbsorptionPercent,
          realDisbursedPercent,
          activeCommittedPercent,
          agendaAbsorptionPercent,
          initiativeAbsorptionPercent,
          totalProposalsCount: proposals.length,
          contractedProposalsCount: contractedList.length,
          inPipelineCount: inPipelineList.length
        },
        contractedProposals: contractedList,
        pipelineProposals: inPipelineList
      }
    });
  } catch (err) {
    console.error('getCurrentFiscalBudget error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat informasi pagu fiskal kas riset.'
    });
  }
};

/**
 * 2. UPDATE / SIMPAN PAGU FISKAL OLEH KEPALA BRIDA
 */
const upsertFiscalBudget = async (req, res) => {
  try {
    // Hanya KEPALA_BRIDA atau STAF_BRIDA
    if (req.user.role !== 'KEPALA_BRIDA' && req.user.role !== 'STAF_BRIDA') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Pengaturan pagu fiskal kas hanya dapat dilakukan oleh Kepala BRIDA.'
      });
    }

    const {
      fiscalYear,
      fundingSource,
      totalBudgetCap,
      agendaAllocation,
      initiativeAllocation,
      notes
    } = req.body;

    const year = parseInt(fiscalYear, 10) || new Date().getFullYear();
    const total = parseFloat(totalBudgetCap) || 0;
    const agenda = parseFloat(agendaAllocation) || 0;
    const initiative = parseFloat(initiativeAllocation) || 0;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total Pagu Belanja Riset Tahunan harus lebih besar dari Rp 0.'
      });
    }

    if (agenda + initiative > total) {
      return res.status(400).json({
        success: false,
        message: `Total penjumlahan alokasi Agenda (Rp ${agenda.toLocaleString('id-ID')}) dan Inisiatif (Rp ${initiative.toLocaleString('id-ID')}) tidak boleh melebihi Total Pagu Kas (Rp ${total.toLocaleString('id-ID')}).`
      });
    }

    const updated = await prisma.fiscalBudgetCap.upsert({
      where: { fiscalYear: year },
      update: {
        fundingSource: fundingSource || 'APBD_MURNI',
        totalBudgetCap: total,
        agendaAllocation: agenda,
        initiativeAllocation: initiative,
        notes: notes || null,
        createdById: req.user.id
      },
      create: {
        fiscalYear: year,
        fundingSource: fundingSource || 'APBD_MURNI',
        totalBudgetCap: total,
        agendaAllocation: agenda,
        initiativeAllocation: initiative,
        notes: notes || null,
        createdById: req.user.id
      }
    });

    // Catat ke Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'FISCAL_BUDGET_UPDATED',
        details: `Kepala BRIDA ${req.user.name} memperbarui Pagu Kas Induk TA ${year}: Total Rp ${total.toLocaleString('id-ID')} (${fundingSource}).`
      }
    });

    return res.json({
      success: true,
      message: `Pagu fiskal belanja litbangda TA ${year} berhasil ditetapkan sebesar Rp ${total.toLocaleString('id-ID')}.`,
      data: updated
    });
  } catch (err) {
    console.error('upsertFiscalBudget error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui pagu fiskal kas riset.'
    });
  }
};

/**
 * 3. DAFTAR SELURUH TAHUN ANGGARAN FISKAL
 */
const listFiscalBudgets = async (req, res) => {
  try {
    const list = await prisma.fiscalBudgetCap.findMany({
      orderBy: { fiscalYear: 'desc' }
    });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error('listFiscalBudgets error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat pagu fiskal.'
    });
  }
};

module.exports = {
  getCurrentFiscalBudget,
  upsertFiscalBudget,
  listFiscalBudgets
};

