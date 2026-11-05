const prisma = require('../../prisma');

/**
 * Mengambil daftar notifikasi milik pengguna yang sedang login
 * Query params:
 * - unreadOnly: 'true' | 'false' (opsional)
 * - limit: number (default 20, max 100)
 * - page: number (default 1)
 */
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 20, page = 1 } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {
      userId
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: parsedLimit,
        skip
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('getUserNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar notifikasi.'
    });
  }
}

/**
 * Menandai satu notifikasi tertentu sebagai telah dibaca
 */
async function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan atau bukan milik akun Anda.'
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return res.json({
      success: true,
      message: 'Notifikasi ditandai sebagai telah dibaca.',
      data: {
        notification: updated,
        unreadCount
      }
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status notifikasi.'
    });
  }
}

/**
 * Menandai seluruh notifikasi yang belum dibaca milik pengguna menjadi telah dibaca
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return res.json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai sebagai telah dibaca.',
      data: {
        unreadCount: 0
      }
    });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status seluruh notifikasi.'
    });
  }
}

/**
 * Menghapus satu notifikasi
 */
async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan.'
      });
    }

    await prisma.notification.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus.'
    });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi.'
    });
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};

