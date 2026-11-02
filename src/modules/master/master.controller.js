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

module.exports = {
  getResearchFields,
  createResearchField,
  getRpjmdPriorities,
  getRegionalOpds
};

