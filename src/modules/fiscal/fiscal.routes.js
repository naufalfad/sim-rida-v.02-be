const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getCurrentFiscalBudget,
  upsertFiscalBudget,
  listFiscalBudgets
} = require('./fiscal.controller');

// Semua rute membutuhkan autentikasi
router.use(authenticate);

// 1. Ambil pagu fiskal tahun berjalan beserta metrik real-time serapan
router.get('/current', getCurrentFiscalBudget);

// 2. Ambil riwayat tahun anggaran fiskal
router.get('/', listFiscalBudgets);

// 3. Simpan / Perbarui pagu fiskal (Otoritas Kepala BRIDA)
router.post('/upsert', upsertFiscalBudget);

module.exports = router;
