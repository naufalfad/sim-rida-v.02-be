const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'simrida_v2_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan kata sandi wajib diisi.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak sesuai.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin BRIDA.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak sesuai.'
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionName: user.institutionName,
      position: user.position,
      department: user.department,
      phone: user.phone,
      nidnOrNip: user.nidnOrNip
    };

    return res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: userProfile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
};

const registerResearcher = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      institutionName,
      nidnOrNip,
      phone,
      department
    } = req.body;

    if (!name || !email || !password || !institutionName) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, email, password, dan nama institusi wajib diisi.'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar. Silakan gunakan email lain atau login.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'PENELITI',
        institutionName: institutionName.trim(),
        nidnOrNip: nidnOrNip ? nidnOrNip.trim() : null,
        phone: phone ? phone.trim() : null,
        department: department ? department.trim() : null,
        isActive: true
      }
    });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran peneliti berhasil.',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          institutionName: newUser.institutionName,
          nidnOrNip: newUser.nidnOrNip,
          phone: newUser.phone,
          department: newUser.department
        }
      }
    });
  } catch (err) {
    console.error('Register researcher error:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses pendaftaran.'
    });
  }
};

const getMe = async (req, res) => {
  return res.json({
    success: true,
    data: req.user
  });
};

const getOpdList = async (req, res) => {
  try {
    const opds = await prisma.user.findMany({
      where: { role: 'OPD', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        institutionName: true,
        position: true
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: opds });
  } catch (err) {
    console.error('Get OPD list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar OPD.' });
  }
};

const getReviewersList = async (req, res) => {
  try {
    const reviewers = await prisma.user.findMany({
      where: { role: 'REVIEWER_BRIDA', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        institutionName: true,
        position: true,
        nidnOrNip: true
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: reviewers });
  } catch (err) {
    console.error('Get Reviewers list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar Reviewer BRIDA.' });
  }
};

module.exports = {
  login,
  registerResearcher,
  getMe,
  getOpdList,
  getReviewersList
};

