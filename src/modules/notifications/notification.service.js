const prisma = require('../../prisma');

/**
 * Buat notifikasi tunggal untuk satu pengguna
 */
async function createNotification({ userId, title, message, type = 'INFO', link = null }) {
  if (!userId || !title || !message) return null;
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
        isRead: false
      }
    });
  } catch (error) {
    console.error(`[NotificationService] Gagal membuat notifikasi untuk user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Buat notifikasi massal untuk daftar ID pengguna
 */
async function notifyUsers(userIds, { title, message, type = 'INFO', link = null }) {
  if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message) return [];
  try {
    const data = userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      link,
      isRead: false
    }));

    await prisma.notification.createMany({
      data
    });
    return data;
  } catch (error) {
    console.error(`[NotificationService] Gagal broadcast notifikasi ke ${userIds.length} users:`, error.message);
    return [];
  }
}

/**
 * Buat notifikasi untuk semua pengguna berdasarkan Role tertentu
 * (contoh: STAF_BRIDA, REVIEWER_BRIDA, KEPALA_BRIDA)
 */
async function notifyRole(role, { title, message, type = 'INFO', link = null }) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role,
        isActive: true
      },
      select: { id: true }
    });

    if (users.length === 0) return [];
    return await notifyUsers(users.map((u) => u.id), { title, message, type, link });
  } catch (error) {
    console.error(`[NotificationService] Gagal broadcast notifikasi ke role ${role}:`, error.message);
    return [];
  }
}

/**
 * Buat notifikasi untuk OPD sasaran (atau seluruh user OPD jika dinas spesifik tidak ditemukan)
 */
async function notifyOpdUsers(targetOpdName, { title, message, type = 'INFO', link = null }) {
  try {
    let users = [];
    if (targetOpdName) {
      users = await prisma.user.findMany({
        where: {
          role: 'OPD',
          isActive: true,
          institutionName: {
            contains: targetOpdName,
            mode: 'insensitive'
          }
        },
        select: { id: true }
      });
    }

    // Jika tidak ada user spesifik dengan nama OPD tersebut, kirim ke seluruh user ber-role OPD
    if (users.length === 0) {
      users = await prisma.user.findMany({
        where: {
          role: 'OPD',
          isActive: true
        },
        select: { id: true }
      });
    }

    if (users.length === 0) return [];
    return await notifyUsers(users.map((u) => u.id), { title, message, type, link });
  } catch (error) {
    console.error(`[NotificationService] Gagal mengirim notifikasi ke OPD (${targetOpdName}):`, error.message);
    return [];
  }
}

module.exports = {
  createNotification,
  notifyUsers,
  notifyRole,
  notifyOpdUsers
};

