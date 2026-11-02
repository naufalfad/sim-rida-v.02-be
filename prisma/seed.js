const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Memulai Seeding SIM-RIDA v2.0 (Model Nasional & General) ---');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Akun PENELITI (Universitas / Lembaga Riset)
  const researcher = await prisma.user.upsert({
    where: { email: 'peneliti@ugm.ac.id' },
    update: {},
    create: {
      name: 'Dr. Ir. Budi Santoso, M.Sc.',
      email: 'peneliti@ugm.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Pusat Studi Kebijakan & Lingkungan Universitas',
      position: 'Ketua Tim Peneliti',
      nidnOrNip: '0012058001',
      phone: '081234567890',
      department: 'Fakultas Geografi / Pusat Studi Kebijakan'
    }
  });
  console.log('✓ Akun Peneliti dibuat/ready:', researcher.email);

  // 2. Akun GERBANG 1: Staf BRIDA (Verifikasi Awal & Anti-Duplikasi)
  const stafBrida = await prisma.user.upsert({
    where: { email: 'staf.brida@pemda.go.id' },
    update: {},
    create: {
      name: 'Ahmad Fauzi, S.IP.',
      email: 'staf.brida@pemda.go.id',
      password: defaultPassword,
      role: 'STAF_BRIDA',
      institutionName: 'Badan Riset dan Inovasi Daerah (BRIDA)',
      position: 'Staf Verifikasi Administrasi & Dokumentasi Riset',
      nidnOrNip: '199204122018011002',
      phone: '08114811122'
    }
  });
  console.log('✓ Akun Staf BRIDA (Gerbang 1) dibuat/ready:', stafBrida.email);

  // 3. Akun GERBANG 2: Tim Teknis Reviewer BRIDA (Relevansi Kebutuhan OPD)
  const reviewerBrida = await prisma.user.upsert({
    where: { email: 'reviewer@pemda.go.id' },
    update: {},
    create: {
      name: 'Dr. Siti Rahmawati, M.Si.',
      email: 'reviewer@pemda.go.id',
      password: defaultPassword,
      role: 'REVIEWER_BRIDA',
      institutionName: 'Badan Riset dan Inovasi Daerah (BRIDA)',
      position: 'Ketua Tim Teknis Litbang & Relevansi Kebijakan OPD',
      nidnOrNip: '198407152010012004',
      phone: '08114822233'
    }
  });
  console.log('✓ Akun Reviewer BRIDA (Gerbang 2) dibuat/ready:', reviewerBrida.email);

  // 4. Akun GERBANG 3: Kepala BRIDA (Pemutus Mutlak Anggaran & Pengesah)
  const kepalaBrida = await prisma.user.upsert({
    where: { email: 'kepala.brida@pemda.go.id' },
    update: {},
    create: {
      name: 'Drs. H. Hendra Wijaya, M.Si.',
      email: 'kepala.brida@pemda.go.id',
      password: defaultPassword,
      role: 'KEPALA_BRIDA',
      institutionName: 'Badan Riset dan Inovasi Daerah (BRIDA)',
      position: 'Kepala Badan Riset dan Inovasi Daerah',
      nidnOrNip: '197505101998031005',
      phone: '08114899999'
    }
  });
  console.log('✓ Akun Kepala BRIDA (Gerbang 3) dibuat/ready:', kepalaBrida.email);

  // 5. Akun OPD: Dinas Kesehatan
  const opdDinkes = await prisma.user.upsert({
    where: { email: 'dinkes@pemda.go.id' },
    update: {},
    create: {
      name: 'Dinas Kesehatan',
      email: 'dinkes@pemda.go.id',
      password: defaultPassword,
      role: 'OPD',
      institutionName: 'Dinas Kesehatan Pemerintah Daerah',
      position: 'Kepala Sub Bagian Program & Perencanaan',
      phone: '081344556677'
    }
  });
  console.log('✓ Akun OPD Dinkes dibuat/ready:', opdDinkes.email);

  // 6. Akun OPD: Bappeda
  const opdBappeda = await prisma.user.upsert({
    where: { email: 'bappeda@pemda.go.id' },
    update: {},
    create: {
      name: 'Bappeda',
      email: 'bappeda@pemda.go.id',
      password: defaultPassword,
      role: 'OPD',
      institutionName: 'Badan Perencanaan Pembangunan Daerah (Bappeda)',
      position: 'Kepala Bidang Litbang & Perencanaan',
      phone: '081344889900'
    }
  });
  console.log('✓ Akun OPD Bappeda dibuat/ready:', opdBappeda.email);

  // 7. Agenda Prioritas Riset Daerah 2026 (General Indonesia)
  await prisma.researchAgenda.create({
    data: {
      year: 2026,
      title: 'Kajian Strategis Percepatan Penurunan Stunting Berbasis Potensi Pangan Lokal Daerah',
      description: 'Penelitian evaluatif dan intervensi spesifik untuk mengoptimalkan potensi gizi pangan lokal dalam penanggulangan stunting balita di wilayah pesisir dan perdesaan daerah.',
      field: 'Sosial Budaya & Kesehatan',
      isOpen: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      createdById: kepalaBrida.id
    }
  });

  await prisma.researchAgenda.create({
    data: {
      year: 2026,
      title: 'Studi Kelayakan Pengembangan Rantai Dingin (Cold Chain) & Hilirisasi Hasil Laut Nelayan Tradisional',
      description: 'Kajian tekno-ekonomi dan model kelembagaan pengelolaan pascapanen perikanan tangkap untuk meningkatkan nilai tukar nelayan tradisional daerah.',
      field: 'Ekonomi & Infrastruktur',
      isOpen: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      createdById: kepalaBrida.id
    }
  });
  console.log('✓ 2 Agenda Prioritas Riset Daerah 2026 berhasil dibuat.');

  // 8. Master Data Bidang Kajian Riset & Inovasi Daerah (Standar Nasional)
  const masterFields = [
    {
      code: 'BKD-01',
      name: 'Sosial, Kependudukan & Kebudayaan',
      description: 'Kesejahteraan sosial, penanggulangan kemiskinan, kearifan lokal, dan integrasi sosial kemasyarakatan daerah.',
      sortOrder: 1
    },
    {
      code: 'BKD-02',
      name: 'Kesehatan Masyarakat & Penanggulangan Stunting',
      description: 'Pencegahan stunting, ketahanan gizi keluarga, epidemiologi, dan peningkatan mutu layanan faskes daerah.',
      sortOrder: 2
    },
    {
      code: 'BKD-03',
      name: 'Pendidikan, Kebudayaan & Pengembangan SDM',
      description: 'Pemerataan mutu pendidikan daerah, link & match vokasi industri, literasi, dan kompetensi tenaga pendidik.',
      sortOrder: 3
    },
    {
      code: 'BKD-04',
      name: 'Perekonomian, Perdagangan, UMKM & Keuangan Daerah',
      description: 'Peningkatan PAD, efisiensi rantai pasok daerah, pengendalian inflasi, dan pemberdayaan koperasi/UMKM.',
      sortOrder: 4
    },
    {
      code: 'BKD-05',
      name: 'Pertanian, Peternakan & Ketahanan Pangan Berkelanjutan',
      description: 'Peningkatan produktivitas komoditas pangan lokal, pertanian presisi, dan kedaulatan pangan wilayah.',
      sortOrder: 5
    },
    {
      code: 'BKD-06',
      name: 'Kelautan, Perikanan & Pemberdayaan Masyarakat Pesisir',
      description: 'Hilirisasi hasil tangkap laut, budidaya perikanan, dan penguatan ekonomi nelayan tradisional pesisir.',
      sortOrder: 6
    },
    {
      code: 'BKD-07',
      name: 'Tata Kelola Pemerintahan, Kebijakan Publik & Reformasi Birokrasi',
      description: 'Inovasi pelayanan publik, penguatan regulasi/perda, akuntabilitas kinerja, dan SPBE terintegrasi daerah.',
      sortOrder: 7
    },
    {
      code: 'BKD-08',
      name: 'Infrastruktur Wilayah, Permukiman & Penataan Ruang',
      description: 'Konektivitas transportasi wilayah, penyediaan air bersih & sanitasi, dan tata ruang wilayah terpadu.',
      sortOrder: 8
    },
    {
      code: 'BKD-09',
      name: 'Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah',
      description: 'Pengelolaan persampahan/limbah, konservasi keanekaragaman hayati, dan kesiapsiagaan mitigasi bencana.',
      sortOrder: 9
    },
    {
      code: 'BKD-10',
      name: 'Energi Terbarukan, Sains Terapan & Transformasi Digital',
      description: 'Pemanfaatan energi baru terbarukan mikrohidro/surya, teknologi tepat guna perdesaan, dan inovasi digital.',
      sortOrder: 10
    }
  ];

  for (const field of masterFields) {
    await prisma.researchField.upsert({
      where: { code: field.code },
      update: {
        name: field.name,
        description: field.description,
        sortOrder: field.sortOrder,
        isActive: true
      },
      create: {
        code: field.code,
        name: field.name,
        description: field.description,
        sortOrder: field.sortOrder,
        isActive: true
      }
    });
  }
  console.log(`✓ ${masterFields.length} Master Data Bidang Kajian Riset Daerah berhasil di-seed.`);

  // ---------------------------------------------------------------------------
  // 6. Master Data Prioritas Tematik RPJMD Daerah
  // ---------------------------------------------------------------------------
  const rpjmdPriorities = [
    {
      code: 'RPJMD-01',
      name: 'Penanggulangan Kemiskinan Ekstrem & Penurunan Stunting',
      description: 'Prioritas intervensi gizi terintegrasi, sanitasi dasar, dan perlindungan sosial terpadu keluarga rentan.',
      sortOrder: 1
    },
    {
      code: 'RPJMD-02',
      name: 'Kemandirian Pangan Lokal & Ketahanan Iklim',
      description: 'Penguatan rantai pasok pangan komoditas lokal, mitigasi bencana iklim, dan inovasi pertanian berkelanjutan.',
      sortOrder: 2
    },
    {
      code: 'RPJMD-03',
      name: 'Peningkatan Kualitas SDM, Pendidikan & Layanan Kesehatan',
      description: 'Pemerataan akses pendidikan vokasi daerah, fasilitas faskes primer, dan transformasi digital pendidikan.',
      sortOrder: 3
    },
    {
      code: 'RPJMD-04',
      name: 'Pemberdayaan Ekonomi Kerakyatan, UMKM & Pariwisata',
      description: 'Hilirisasi produk unggulan lokal, digitalisasi UMKM desa/kelurahan, dan pariwisata ramah lingkungan.',
      sortOrder: 4
    },
    {
      code: 'RPJMD-05',
      name: 'Tata Kelola Pemerintahan Akuntabel, Digitalisasi & Reformasi Birokrasi',
      description: 'Implementasi SPBE, pengawasan internal terintegrasi, dan peningkatan indeks kepuasan layanan publik.',
      sortOrder: 5
    },
    {
      code: 'RPJMD-06',
      name: 'Infrastruktur Terintegrasi & Pengelolaan Lingkungan Berkelanjutan',
      description: 'Konektivitas wilayah tertinggal, pengelolaan persampahan terpadu, dan perlindungan keanekaragaman hayati.',
      sortOrder: 6
    }
  ];

  for (const item of rpjmdPriorities) {
    await prisma.masterRpjmd.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: true
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: true
      }
    });
  }
  console.log(`✓ ${rpjmdPriorities.length} Master Data Prioritas RPJMD Daerah berhasil di-seed.`);

  // ---------------------------------------------------------------------------
  // 7. Master Data Perangkat Daerah (OPD Lintas Sektor)
  // ---------------------------------------------------------------------------
  const masterOpds = [
    // Rumpun Perencanaan & Pengawasan
    { code: 'OPD-01', shortName: 'BAPPEDA', name: 'Badan Perencanaan Pembangunan Daerah', category: 'PERENCANAAN', sortOrder: 1 },
    { code: 'OPD-02', shortName: 'BPKAD', name: 'Badan Pengelolaan Keuangan dan Aset Daerah', category: 'PERENCANAAN', sortOrder: 2 },
    { code: 'OPD-03', shortName: 'BAPENDA', name: 'Badan Pendapatan Daerah', category: 'PERENCANAAN', sortOrder: 3 },
    { code: 'OPD-04', shortName: 'Inspektorat', name: 'Inspektorat Daerah', category: 'PERENCANAAN', sortOrder: 4 },

    // Rumpun Perekonomian & Ketahanan
    { code: 'OPD-05', shortName: 'Dinas Pertanian & Ketahanan Pangan', name: 'Dinas Pertanian dan Ketahanan Pangan', category: 'PEREKONOMIAN', sortOrder: 5 },
    { code: 'OPD-06', shortName: 'Dinas Perindustrian & Perdagangan', name: 'Dinas Perindustrian dan Perdagangan', category: 'PEREKONOMIAN', sortOrder: 6 },
    { code: 'OPD-07', shortName: 'Dinas Kelautan & Perikanan', name: 'Dinas Kelautan dan Perikanan', category: 'PEREKONOMIAN', sortOrder: 7 },
    { code: 'OPD-08', shortName: 'Dinas Koperasi & UMKM', name: 'Dinas Koperasi dan Usaha Kecil Menengah', category: 'PEREKONOMIAN', sortOrder: 8 },
    { code: 'OPD-09', shortName: 'Dinas Pariwisata', name: 'Dinas Pariwisata, Kebudayaan, Pemuda dan Olahraga', category: 'PEREKONOMIAN', sortOrder: 9 },
    { code: 'OPD-10', shortName: 'Dinas Peternakan', name: 'Dinas Peternakan dan Kesehatan Hewan', category: 'PEREKONOMIAN', sortOrder: 10 },

    // Rumpun Sosial & SDM
    { code: 'OPD-11', shortName: 'Dinas Kesehatan', name: 'Dinas Kesehatan', category: 'SOSIAL_SDM', sortOrder: 11 },
    { code: 'OPD-12', shortName: 'Dinas Pendidikan', name: 'Dinas Pendidikan', category: 'SOSIAL_SDM', sortOrder: 12 },
    { code: 'OPD-13', shortName: 'Dinas Sosial', name: 'Dinas Sosial', category: 'SOSIAL_SDM', sortOrder: 13 },
    { code: 'OPD-14', shortName: 'DP3A', name: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', category: 'SOSIAL_SDM', sortOrder: 14 },
    { code: 'OPD-15', shortName: 'Dinas Tenaga Kerja', name: 'Dinas Tenaga Kerja dan Transmigrasi', category: 'SOSIAL_SDM', sortOrder: 15 },
    { code: 'OPD-16', shortName: 'Disdukcapil', name: 'Dinas Kependudukan dan Pencatatan Sipil', category: 'SOSIAL_SDM', sortOrder: 16 },

    // Rumpun Infrastruktur & Lingkungan
    { code: 'OPD-17', shortName: 'Dinas PU-PR', name: 'Dinas Pekerjaan Umum dan Penataan Ruang', category: 'INFRASTRUKTUR', sortOrder: 17 },
    { code: 'OPD-18', shortName: 'Dinas Lingkungan Hidup', name: 'Dinas Lingkungan Hidup', category: 'INFRASTRUKTUR', sortOrder: 18 },
    { code: 'OPD-19', shortName: 'Dinas Perkim', name: 'Dinas Perumahan dan Kawasan Permukiman', category: 'INFRASTRUKTUR', sortOrder: 19 },
    { code: 'OPD-20', shortName: 'Dinas Perhubungan', name: 'Dinas Perhubungan', category: 'INFRASTRUKTUR', sortOrder: 20 },
    { code: 'OPD-21', shortName: 'Diskominfo', name: 'Dinas Komunikasi dan Informatika', category: 'INFRASTRUKTUR', sortOrder: 21 }
  ];

  for (const opd of masterOpds) {
    await prisma.masterOpd.upsert({
      where: { code: opd.code },
      update: {
        name: opd.name,
        shortName: opd.shortName,
        category: opd.category,
        sortOrder: opd.sortOrder,
        isActive: true
      },
      create: {
        code: opd.code,
        name: opd.name,
        shortName: opd.shortName,
        category: opd.category,
        sortOrder: opd.sortOrder,
        isActive: true
      }
    });
  }
  console.log(`✓ ${masterOpds.length} Master Data Perangkat Daerah (OPD) berhasil di-seed.`);

  console.log('--- Seeding Selesai 100%! ---');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
