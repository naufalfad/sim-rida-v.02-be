/**
 * Menghitung tanggal jatuh tempo berdasarkan jumlah hari kerja (Senin - Jumat)
 * Default: 14 hari kerja (2 minggu hari kerja)
 */
function calculateWorkingDaysDeadline(startDate = new Date(), workingDays = 14) {
  const date = new Date(startDate);
  let addedDays = 0;

  while (addedDays < workingDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay(); // 0 = Minggu, 6 = Sabtu
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  // Set ke akhir jam kerja (misal: 17:00:00)
  date.setHours(17, 0, 0, 0);
  return date;
}

/**
 * Menghitung sisa hari kerja antara sekarang dan batas tenggat
 */
function getRemainingWorkingDays(deadline) {
  const now = new Date();
  const target = new Date(deadline);
  
  if (now > target) {
    // Terlambat: hitung minus
    return -1;
  }

  let cur = new Date(now);
  let count = 0;

  while (cur < target) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }

  return count;
}

module.exports = {
  calculateWorkingDaysDeadline,
  getRemainingWorkingDays
};

