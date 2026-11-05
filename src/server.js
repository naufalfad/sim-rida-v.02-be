require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./modules/auth/auth.routes');
const agendaRoutes = require('./modules/agendas/agenda.routes');
const proposalRoutes = require('./modules/proposals/proposal.routes');
const masterRoutes = require('./modules/master/master.routes');
const opdNeedRoutes = require('./modules/opd-needs/opd-need.routes');
const fiscalRoutes = require('./modules/fiscal/fiscal.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static uploads serving with cross-subdirectory fallback
app.use('/uploads', (req, res, next) => {
  const directPath = path.join(uploadDir, decodeURIComponent(req.path));
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return next();
  }

  // Fallback: jika path URL (/uploads/contracts/...) tidak sama persis dengan folder fisik (/uploads/proposals/...),
  // cari berdasarkan nama file di seluruh subdirektori uploads agar dokumen tetap bisa diakses & diunduh
  const filename = path.basename(decodeURIComponent(req.path));
  const subDirs = ['contracts', 'proposals', 'reports', 'milestones', 'dispositions', 'responses'];
  for (const sub of subDirs) {
    const candidatePath = path.join(uploadDir, sub, filename);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return res.sendFile(candidatePath);
    }
  }

  next();
});
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SIMRIDA v2.0 API',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agendas', agendaRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/opd-needs', opdNeedRoutes);
app.use('/api/fiscal-budgets', fiscalRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute [${req.method}] ${req.url} tidak ditemukan.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.'
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`[INFO] SIMRIDA v2.0 Backend running on port ${PORT}`);
  console.log(`   Database: PostgreSQL (simrida2_db)`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
