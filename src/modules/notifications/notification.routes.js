const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const notificationController = require('./notification.controller');

// Seluruh rute notifikasi memerlukan autentikasi pengguna
router.use(authenticate);

// Ambil daftar notifikasi (dengan unreadCount & paginasi)
router.get('/', notificationController.getUserNotifications);

// Tandai seluruh notifikasi belum dibaca menjadi sudah dibaca
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Tandai satu notifikasi tertentu sebagai dibaca
router.patch('/:id/read', notificationController.markAsRead);

// Hapus satu notifikasi
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

