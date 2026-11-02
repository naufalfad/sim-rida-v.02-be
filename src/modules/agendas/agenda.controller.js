const prisma = require('../../prisma');

const listAgendas = async (req, res) => {
  try {
    const { year, isOpen } = req.query;
    const filter = {};

    if (year) filter.year = parseInt(year);
    if (isOpen !== undefined) filter.isOpen = isOpen === 'true';

    const agendas = await prisma.researchAgenda.findMany({
      where: filter,
      include: {
        createdBy: {
          select: { name: true, institutionName: true }
        },
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: agendas
    });
  } catch (err) {
    console.error('List agendas error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil agenda riset.' });
  }
};

const createAgenda = async (req, res) => {
  try {
    const { year, title, description, field, startDate, endDate } = req.body;

    if (!year || !title || !description || !field) {
      return res.status(400).json({
        success: false,
        message: 'Tahun, judul agenda, deskripsi, dan bidang kajian wajib diisi.'
      });
    }

    const newAgenda = await prisma.researchAgenda.create({
      data: {
        year: parseInt(year),
        title: title.trim(),
        description: description.trim(),
        field: field.trim(),
        isOpen: true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: req.user.id
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Agenda prioritas riset daerah berhasil dibuat.',
      data: newAgenda
    });
  } catch (err) {
    console.error('Create agenda error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat agenda riset.' });
  }
};

module.exports = {
  listAgendas,
  createAgenda
};

