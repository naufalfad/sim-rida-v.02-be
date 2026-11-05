const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Mendapatkan daftar Master Data Bidang Kajian Riset & Inovasi Daerah
 * GET /api/master/research-fields
 */
const getResearchFields = async (req, res) => {
  try {
    const fields = await prisma.researchField.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json({
      success: true,
      message: 'Master data bidang kajian berhasil diambil.',
      data: fields
    });
  } catch (err) {
    console.error('Get research fields error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil master data bidang kajian.'
    });
  }
};

/**
 * Menambahkan Bidang Kajian Baru (Khusus Pimpinan / Admin BRIDA)
 * POST /api/master/research-fields
 */
const createResearchField = async (req, res) => {
  try {
    const { code, name, description, sortOrder } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Kode dan Nama Bidang Kajian wajib diisi.'
      });
    }

    const existing = await prisma.researchField.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Bidang kajian dengan kode ${code} sudah terdaftar.`
      });
    }

    const newField = await prisma.researchField.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: parseInt(sortOrder) || 0
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Bidang kajian baru berhasil ditambahkan.',
      data: newField
    });
  } catch (err) {
    console.error('Create research field error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan bidang kajian baru.'
    });
  }
};

/**
 * Mendapatkan daftar Master Data Prioritas Tematik RPJMD Daerah
 * GET /api/master/rpjmd-priorities
 */
const getRpjmdPriorities = async (req, res) => {
  try {
    const list = await prisma.masterRpjmd.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json({
      success: true,
      message: 'Master data prioritas RPJMD berhasil diambil.',
      data: list
    });
  } catch (err) {
    console.error('Get RPJMD error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil master data RPJMD.'
    });
  }
};

/**
 * Mendapatkan daftar Master Data OPD Lintas Sektor
 * GET /api/master/regional-opds
 */
const getRegionalOpds = async (req, res) => {
  try {
    const list = await prisma.masterOpd.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            institutionName: true,
            position: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json({
      success: true,
      message: 'Master data OPD lintas sektor berhasil diambil.',
      data: list
    });
  } catch (err) {
    console.error('Get regional opds error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil master data OPD.'
    });
  }
};

/**
 * Mendapatkan daftar Master Data Instrumen Regulasi Kebijakan
 * GET /api/master/policy-instruments
 */
const getPolicyInstruments = async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === 'true' ? {} : { isActive: true };

    const list = await prisma.masterPolicyInstrument.findMany({
      where: filter,
      orderBy: { sortOrder: 'asc' }
    });

    return res.json({
      success: true,
      message: 'Master data instrumen regulasi kebijakan berhasil diambil.',
      data: list
    });
  } catch (err) {
    console.error('Get policy instruments error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil master data instrumen regulasi.'
    });
  }
};

/**
 * Menambahkan Instrumen Regulasi Baru
 * POST /api/master/policy-instruments
 */
const createPolicyInstrument = async (req, res) => {
  try {
    const { code, name, category, description, sortOrder } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Kode dan Nama Instrumen Regulasi wajib diisi.'
      });
    }

    const existing = await prisma.masterPolicyInstrument.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Instrumen regulasi dengan kode ${code} sudah terdaftar.`
      });
    }

    const newItem = await prisma.masterPolicyInstrument.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category: category || 'REGULASI_DAERAH',
        description: description?.trim() || null,
        sortOrder: parseInt(sortOrder) || 0
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Instrumen regulasi baru berhasil ditambahkan.',
      data: newItem
    });
  } catch (err) {
    console.error('Create policy instrument error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan instrumen regulasi baru.'
    });
  }
};

/**
 * Mendapatkan daftar Master Data Sub-Kegiatan & Rekening DPA BRIDA
 * GET /api/master/dpa-accounts
 */
const getDpaAccounts = async (req, res) => {
  try {
    const { year, all } = req.query;
    const filter = all === 'true' ? {} : { isActive: true };
    if (year) filter.fiscalYear = parseInt(year);

    const list = await prisma.masterDpaAccount.findMany({
      where: filter,
      orderBy: [{ fiscalYear: 'desc' }, { sortOrder: 'asc' }]
    });

    return res.json({
      success: true,
      message: 'Master data rekening belanja DPA BRIDA berhasil diambil.',
      data: list
    });
  } catch (err) {
    console.error('Get DPA accounts error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil master data rekening belanja DPA.'
    });
  }
};

/**
 * Menambahkan Sub-Kegiatan & Rekening DPA BRIDA Baru
 * POST /api/master/dpa-accounts
 */
const createDpaAccount = async (req, res) => {
  try {
    const {
      subActivityCode,
      subActivityName,
      budgetAccountCode,
      budgetAccountName,
      fiscalYear,
      sortOrder
    } = req.body;

    if (!subActivityCode || !subActivityName || !budgetAccountCode) {
      return res.status(400).json({
        success: false,
        message: 'Kode Sub-kegiatan, Uraian Sub-kegiatan, dan Kode Rekening wajib diisi.'
      });
    }

    const newItem = await prisma.masterDpaAccount.create({
      data: {
        subActivityCode: subActivityCode.trim(),
        subActivityName: subActivityName.trim(),
        budgetAccountCode: budgetAccountCode.trim(),
        budgetAccountName: budgetAccountName?.trim() || 'Belanja Jasa Tenaga Ahli Riset',
        fiscalYear: parseInt(fiscalYear) || new Date().getFullYear() + 1,
        sortOrder: parseInt(sortOrder) || 0
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Sub-kegiatan dan Rekening DPA BRIDA baru berhasil ditambahkan.',
      data: newItem
    });
  } catch (err) {
    console.error('Create DPA account error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan rekening belanja DPA baru.'
    });
  }
};

/**
 * Mengubah status aktif/non-aktif master data secara generik
 * PATCH /api/master/:type/:id/toggle-status
 */
const toggleMasterStatus = async (req, res) => {
  try {
    const { type, id } = req.params;

    let model = null;
    switch (type) {
      case 'research-fields':
        model = prisma.researchField;
        break;
      case 'rpjmd-priorities':
        model = prisma.masterRpjmd;
        break;
      case 'regional-opds':
        model = prisma.masterOpd;
        break;
      case 'policy-instruments':
        model = prisma.masterPolicyInstrument;
        break;
      case 'dpa-accounts':
        model = prisma.masterDpaAccount;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipe master data tidak valid.'
        });
    }

    const item = await model.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Data master tidak ditemukan.'
      });
    }

    const updated = await model.update({
      where: { id },
      data: { isActive: !item.isActive }
    });

    return res.json({
      success: true,
      message: `Status master data berhasil diubah menjadi ${updated.isActive ? 'AKTIF' : 'NON-AKTIF'}.`,
      data: updated
    });
  } catch (err) {
    console.error('Toggle master status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status master data.'
    });
  }
};

/**
 * Ringkasan seluruh master data untuk modul manajemen
 * GET /api/master/overview
 */
const getAllMasterSummary = async (req, res) => {
  try {
    const [fields, rpjmds, opds, policyInstruments, dpaAccounts] = await Promise.all([
      prisma.researchField.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.masterRpjmd.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.masterOpd.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.masterPolicyInstrument.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.masterDpaAccount.findMany({ orderBy: [{ fiscalYear: 'desc' }, { sortOrder: 'asc' }] })
    ]);

    return res.json({
      success: true,
      data: {
        researchFields: fields,
        rpjmdPriorities: rpjmds,
        regionalOpds: opds,
        policyInstruments: policyInstruments,
        dpaAccounts: dpaAccounts
      }
    });
  } catch (err) {
    console.error('Get all master summary error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil ringkasan seluruh master data.'
    });
  }
};

module.exports = {
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
};

