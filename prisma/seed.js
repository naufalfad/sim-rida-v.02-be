const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('--- RESET & SEEDING SIM-RIDA v2.0 (DATASET BERSIH & AWAL) ---');
  console.log('===============================================================');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // ---------------------------------------------------------------------------
  // 1. PEMBERSIHAN DATA TRANSAKSI (RESET ULANG TOTAL PROPOSAL & AGENDA)
  // ---------------------------------------------------------------------------
  console.log('1. Membersihkan seluruh data pengajuan & transaksi lama...');
  await prisma.opdActionResponse.deleteMany();
  await prisma.opdDisposition.deleteMany();
  await prisma.policyRecommendation.deleteMany();
  await prisma.researchResult.deleteMany();
  await prisma.contractDocument.deleteMany();
  await prisma.kakDocument.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.opdResearchNeed.deleteMany();
  await prisma.researchProposal.deleteMany();
  await prisma.researchAgenda.deleteMany();
  console.log('✓ Seluruh data transaksi riset, kontrak, disposisi & proposal lama berhasil di-reset.');

  // ---------------------------------------------------------------------------
  // 2. SEEDING / UPSERT AKUN PENGGUNA (USERS)
  // ---------------------------------------------------------------------------
  console.log('2. Menyiapkan akun pengguna sistem...');

  // 2.1 Akun Birokrasi BRIDA
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

  // 2.2 Akun Organisasi Perangkat Daerah (OPD)
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

  const opdPertanian = await prisma.user.upsert({
    where: { email: 'pertanian@pemda.go.id' },
    update: {},
    create: {
      name: 'Dinas Pertanian & Ketahanan Pangan',
      email: 'pertanian@pemda.go.id',
      password: defaultPassword,
      role: 'OPD',
      institutionName: 'Dinas Pertanian dan Ketahanan Pangan',
      position: 'Kepala Bidang Ketersediaan & Distribusi Pangan',
      phone: '081344223344'
    }
  });

  const opdPupr = await prisma.user.upsert({
    where: { email: 'pupr@pemda.go.id' },
    update: {},
    create: {
      name: 'Dinas PUPR',
      email: 'pupr@pemda.go.id',
      password: defaultPassword,
      role: 'OPD',
      institutionName: 'Dinas Pekerjaan Umum dan Penataan Ruang',
      position: 'Kepala Seksi Air Bersih & Sanitasi Lingkungan',
      phone: '081344334455'
    }
  });

  const opdDlh = await prisma.user.upsert({
    where: { email: 'dlh@pemda.go.id' },
    update: {},
    create: {
      name: 'Dinas Lingkungan Hidup',
      email: 'dlh@pemda.go.id',
      password: defaultPassword,
      role: 'OPD',
      institutionName: 'Dinas Lingkungan Hidup Daerah',
      position: 'Kepala Bidang Pengendalian Pencemaran & Konservasi',
      phone: '081344445566'
    }
  });

  // 2.3 Akun Peneliti Akademisi (5 Universitas Terkemuka)
  const researcherUgm = await prisma.user.upsert({
    where: { email: 'peneliti@ugm.ac.id' },
    update: {},
    create: {
      name: 'Dr. Ir. Budi Santoso, M.Sc.',
      email: 'peneliti@ugm.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Pusat Studi Kebijakan & Lingkungan Universitas Gadjah Mada',
      position: 'Ketua Tim Peneliti',
      nidnOrNip: '0012058001',
      phone: '081234567890',
      department: 'Fakultas Geografi / Pusat Studi Kebijakan'
    }
  });

  const researcherItb = await prisma.user.upsert({
    where: { email: 'peneliti.itb@kampus.ac.id' },
    update: {},
    create: {
      name: 'Dr. Eng. Wahyu Pratama, S.T., M.T.',
      email: 'peneliti.itb@kampus.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Institut Teknologi Bandung (ITB)',
      position: 'Dosen & Peneliti Senior',
      nidnOrNip: '0024088203',
      phone: '081298765432',
      department: 'Sekolah Arsitektur, Perencanaan dan Pengembangan Kebijakan'
    }
  });

  const researcherIpb = await prisma.user.upsert({
    where: { email: 'peneliti.ipb@kampus.ac.id' },
    update: {},
    create: {
      name: 'Dr. Hendra Gunawan, S.Pi., M.Si.',
      email: 'peneliti.ipb@kampus.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Institut Pertanian Bogor (IPB University)',
      position: 'Kepala Laboratorium Pengolahan Hasil Laut',
      nidnOrNip: '0015037902',
      phone: '081311223344',
      department: 'Fakultas Perikanan dan Ilmu Kelautan'
    }
  });

  const researcherUncen = await prisma.user.upsert({
    where: { email: 'peneliti.uncen@kampus.ac.id' },
    update: {},
    create: {
      name: 'Dr. Maria Rahantoknam, S.ST., M.Kes.',
      email: 'peneliti.uncen@kampus.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Universitas Cenderawasih (UNCEN)',
      position: 'Ketua Jurusan Kebijakan Kesehatan',
      nidnOrNip: '0019098401',
      phone: '081388990011',
      department: 'Fakultas Kesehatan Masyarakat'
    }
  });

  const researcherUnipa = await prisma.user.upsert({
    where: { email: 'peneliti.unipa@kampus.ac.id' },
    update: {},
    create: {
      name: 'Prof. Dr. Frans Mayor, M.Si.',
      email: 'peneliti.unipa@kampus.ac.id',
      password: defaultPassword,
      role: 'PENELITI',
      institutionName: 'Universitas Papua (UNIPA)',
      position: 'Guru Besar Agroteknologi & Pangan Lokal',
      nidnOrNip: '0005067104',
      phone: '081377889922',
      department: 'Fakultas Pertanian & Peternakan'
    }
  });

  console.log('✓ Akun BRIDA, OPD, dan 5 Peneliti Universitas siap.');

  // ---------------------------------------------------------------------------
  // 3. MASTER DATA STANDAR NASIONAL (RPJMD, OPD, REGULASI, DPA, BIDANG KAJIAN)
  // ---------------------------------------------------------------------------
  console.log('3. Memastikan kelengkapan seluruh kamus master data...');

  // 3.1 Master Bidang Kajian
  const masterFields = [
    { code: 'BKD-01', name: 'Sosial, Kependudukan & Kebudayaan', description: 'Kesejahteraan sosial, kemiskinan, dan integrasi sosial.', sortOrder: 1 },
    { code: 'BKD-02', name: 'Kesehatan Masyarakat & Penanggulangan Stunting', description: 'Pencegahan stunting, ketahanan gizi keluarga, dan mutu layanan faskes.', sortOrder: 2 },
    { code: 'BKD-03', name: 'Pendidikan, Kebudayaan & Pengembangan SDM', description: 'Pemerataan mutu pendidikan, vokasi, dan literasi daerah.', sortOrder: 3 },
    { code: 'BKD-04', name: 'Perekonomian, Perdagangan, UMKM & Keuangan Daerah', description: 'Peningkatan PAD, efisiensi rantai pasok, dan koperasi UMKM.', sortOrder: 4 },
    { code: 'BKD-05', name: 'Pertanian, Peternakan & Ketahanan Pangan Berkelanjutan', description: 'Produktivitas komoditas pangan lokal dan kedaulatan pangan wilayah.', sortOrder: 5 },
    { code: 'BKD-06', name: 'Kelautan, Perikanan & Pemberdayaan Masyarakat Pesisir', description: 'Hilirisasi hasil laut dan penguatan ekonomi nelayan pesisir.', sortOrder: 6 },
    { code: 'BKD-07', name: 'Tata Kelola Pemerintahan, Kebijakan Publik & Reformasi Birokrasi', description: 'Inovasi pelayanan publik, regulasi daerah, dan SPBE.', sortOrder: 7 },
    { code: 'BKD-08', name: 'Infrastruktur Wilayah, Permukiman & Penataan Ruang', description: 'Konektivitas transportasi, air bersih, sanitasi, dan tata ruang.', sortOrder: 8 },
    { code: 'BKD-09', name: 'Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah', description: 'Persampahan/limbah, keanekaragaman hayati, dan mitigasi bencana.', sortOrder: 9 },
    { code: 'BKD-10', name: 'Energi Terbarukan, Sains Terapan & Transformasi Digital', description: 'Energi baru terbarukan, teknologi tepat guna, dan inovasi digital.', sortOrder: 10 }
  ];
  for (const f of masterFields) {
    await prisma.researchField.upsert({
      where: { code: f.code },
      update: { name: f.name, description: f.description, sortOrder: f.sortOrder, isActive: true },
      create: { code: f.code, name: f.name, description: f.description, sortOrder: f.sortOrder, isActive: true }
    });
  }

  // 3.2 Master RPJMD
  const rpjmdPriorities = [
    { code: 'RPJMD-01', name: 'Penanggulangan Kemiskinan Ekstrem & Penurunan Stunting', description: 'Prioritas intervensi gizi terintegrasi, sanitasi dasar, dan perlindungan sosial.', sortOrder: 1 },
    { code: 'RPJMD-02', name: 'Kemandirian Pangan Lokal & Ketahanan Iklim', description: 'Penguatan rantai pasok pangan komoditas lokal dan pertanian berkelanjutan.', sortOrder: 2 },
    { code: 'RPJMD-03', name: 'Peningkatan Kualitas SDM, Pendidikan & Layanan Kesehatan', description: 'Pemerataan akses pendidikan vokasi daerah dan fasilitas faskes primer.', sortOrder: 3 },
    { code: 'RPJMD-04', name: 'Pemberdayaan Ekonomi Kerakyatan, UMKM & Pariwisata', description: 'Hilirisasi produk unggulan lokal dan digitalisasi UMKM desa.', sortOrder: 4 }
  ];
  for (const rp of rpjmdPriorities) {
    await prisma.masterRpjmd.upsert({
      where: { code: rp.code },
      update: { name: rp.name, description: rp.description, sortOrder: rp.sortOrder, isActive: true },
      create: { code: rp.code, name: rp.name, description: rp.description, sortOrder: rp.sortOrder, isActive: true }
    });
  }

  // 3.3 Master OPD Terintegrasi Akun User
  const masterOpds = [
    { code: 'OPD-01', shortName: 'BAPPEDA', name: 'Badan Perencanaan Pembangunan Daerah', category: 'PERENCANAAN', email: 'bappeda@pemda.go.id', sortOrder: 1 },
    { code: 'OPD-02', shortName: 'DINKES', name: 'Dinas Kesehatan', category: 'SOSIAL_SDM', email: 'dinkes@pemda.go.id', sortOrder: 2 },
    { code: 'OPD-03', shortName: 'DISDIK', name: 'Dinas Pendidikan', category: 'SOSIAL_SDM', email: 'disdik@pemda.go.id', sortOrder: 3 },
    { code: 'OPD-04', shortName: 'DPUPR', name: 'Dinas Pekerjaan Umum dan Penataan Ruang', category: 'INFRASTRUKTUR', email: 'pupr@pemda.go.id', sortOrder: 4 },
    { code: 'OPD-05', shortName: 'DISTANPANG', name: 'Dinas Pertanian dan Ketahanan Pangan', category: 'PEREKONOMIAN', email: 'pertanian@pemda.go.id', sortOrder: 5 },
    { code: 'OPD-06', shortName: 'DKP', name: 'Dinas Kelautan dan Perikanan', category: 'PEREKONOMIAN', email: 'dkp@pemda.go.id', sortOrder: 6 },
    { code: 'OPD-07', shortName: 'DISPERINDAG', name: 'Dinas Perindustrian dan Perdagangan', category: 'PEREKONOMIAN', email: 'disperindag@pemda.go.id', sortOrder: 7 },
    { code: 'OPD-08', shortName: 'DINKOP_UMKM', name: 'Dinas Koperasi dan Usaha Mikro Kecil Menengah', category: 'PEREKONOMIAN', email: 'dinkop@pemda.go.id', sortOrder: 8 },
    { code: 'OPD-09', shortName: 'DLH', name: 'Dinas Lingkungan Hidup', category: 'INFRASTRUKTUR', email: 'dlh@pemda.go.id', sortOrder: 9 },
    { code: 'OPD-10', shortName: 'DINSOS', name: 'Dinas Sosial', category: 'SOSIAL_SDM', email: 'dinsos@pemda.go.id', sortOrder: 10 },
    { code: 'OPD-11', shortName: 'DPMK', name: 'Dinas Pemberdayaan Masyarakat dan Kampung', category: 'SOSIAL_SDM', email: 'dpmk@pemda.go.id', sortOrder: 11 },
    { code: 'OPD-12', shortName: 'KESBANGPOL', name: 'Badan Kesatuan Bangsa dan Politik', category: 'TATA_KELOLA', email: 'kesbangpol@pemda.go.id', sortOrder: 12 },
    { code: 'OPD-13', shortName: 'SETDA_HUKUM', name: 'Bagian Hukum Sekretariat Daerah', category: 'TATA_KELOLA', email: 'hukum@pemda.go.id', sortOrder: 13 },
    { code: 'OPD-14', shortName: 'DP3A', name: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', category: 'SOSIAL_SDM', email: 'dp3a@pemda.go.id', sortOrder: 14 },
    { code: 'OPD-15', shortName: 'Dinas Tenaga Kerja', name: 'Dinas Tenaga Kerja dan Transmigrasi', category: 'SOSIAL_SDM', email: 'disnaker@pemda.go.id', sortOrder: 15 },
    { code: 'OPD-16', shortName: 'Disdukcapil', name: 'Dinas Kependudukan dan Pencatatan Sipil', category: 'SOSIAL_SDM', email: 'disdukcapil@pemda.go.id', sortOrder: 16 },
    { code: 'OPD-19', shortName: 'Dinas Perkim', name: 'Dinas Perumahan dan Kawasan Permukiman', category: 'INFRASTRUKTUR', email: 'perkim@pemda.go.id', sortOrder: 19 },
    { code: 'OPD-20', shortName: 'Dinas Perhubungan', name: 'Dinas Perhubungan', category: 'INFRASTRUKTUR', email: 'dishub@pemda.go.id', sortOrder: 20 },
    { code: 'OPD-21', shortName: 'Diskominfo', name: 'Dinas Komunikasi dan Informatika', category: 'INFRASTRUKTUR', email: 'diskominfo@pemda.go.id', sortOrder: 21 }
  ];
  for (const opd of masterOpds) {
    let user = await prisma.user.findUnique({ where: { email: opd.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: opd.name,
          email: opd.email,
          password: defaultPassword,
          role: 'OPD',
          institutionName: opd.name,
          position: 'Kepala Sub Bagian Program & Perencanaan',
          phone: '0813' + Math.floor(10000000 + Math.random() * 90000000)
        }
      });
    }

    await prisma.masterOpd.upsert({
      where: { code: opd.code },
      update: { name: opd.name, shortName: opd.shortName, category: opd.category, sortOrder: opd.sortOrder, userId: user.id, isActive: true },
      create: { code: opd.code, name: opd.name, shortName: opd.shortName, category: opd.category, sortOrder: opd.sortOrder, userId: user.id, isActive: true }
    });
  }

  // 3.4 Master Regulasi
  const policyInstruments = [
    { code: 'REG-01', name: 'Peraturan Daerah (Perda)', category: 'REGULASI_DAERAH', description: 'Regulasi tertinggi daerah.', sortOrder: 1 },
    { code: 'REG-02', name: 'Peraturan Kepala Daerah (Perbup / Perwali)', category: 'REGULASI_DAERAH', description: 'Peraturan pelaksanaan turunan Perda.', sortOrder: 2 },
    { code: 'REG-03', name: 'Keputusan Kepala Daerah (SK Bupati / Walikota)', category: 'REGULASI_DAERAH', description: 'Penetapan kebijakan administratif definitif.', sortOrder: 3 },
    { code: 'REG-04', name: 'Keputusan Kepala Dinas (SK Kepala OPD)', category: 'SOP_INTERNAL', description: 'Ketetapan teknis operasional internal dinas.', sortOrder: 4 },
    { code: 'REG-05', name: 'Standar Operasional Prosedur (SOP) Teknis', category: 'SOP_INTERNAL', description: 'Pedoman alur kerja baku aparatur pelaksana.', sortOrder: 5 },
    { code: 'REG-06', name: 'Rencana Kerja Perangkat Daerah (Renja OPD / RKPD)', category: 'DOKUMEN_PERENCANAAN', description: 'Dokumen perencanaan tahunan penganggaran.', sortOrder: 6 }
  ];
  for (const pol of policyInstruments) {
    await prisma.masterPolicyInstrument.upsert({
      where: { code: pol.code },
      update: { name: pol.name, category: pol.category, description: pol.description, sortOrder: pol.sortOrder, isActive: true },
      create: { code: pol.code, name: pol.name, category: pol.category, description: pol.description, sortOrder: pol.sortOrder, isActive: true }
    });
  }

  // 3.5 Master DPA
  const dpaAccounts = [
    {
      subActivityCode: '1.04.01.2.02.01',
      subActivityName: 'Penyelenggaraan Penelitian dan Pengembangan Bidang Tata Kelola Pemerintahan dan Pengkajian Peraturan',
      budgetAccountCode: '5.1.02.02.01.0026',
      budgetAccountName: 'Belanja Jasa Tenaga Ahli Riset Kebijakan & Tata Kelola Daerah',
      fiscalYear: 2026,
      sortOrder: 1
    },
    {
      subActivityCode: '1.04.01.2.02.02',
      subActivityName: 'Penyelenggaraan Penelitian dan Pengembangan Bidang Sosial Kependudukan, Kesehatan dan Pangan',
      budgetAccountCode: '5.1.02.02.01.0026',
      budgetAccountName: 'Belanja Jasa Tenaga Ahli Riset Sosial, Kesehatan dan Gizi Masyarakat',
      fiscalYear: 2026,
      sortOrder: 2
    }
  ];
  for (const dpa of dpaAccounts) {
    const exist = await prisma.masterDpaAccount.findFirst({
      where: { subActivityCode: dpa.subActivityCode, budgetAccountCode: dpa.budgetAccountCode, fiscalYear: dpa.fiscalYear }
    });
    if (!exist) {
      await prisma.masterDpaAccount.create({ data: dpa });
    }
  }

  console.log('✓ Seluruh Master Data siap.');

  // ---------------------------------------------------------------------------
  // 4. MEMBUAT TEPAT 1 AGENDA RISET DAERAH RESMI (CALL FOR PROPOSALS BRIDA)
  // ---------------------------------------------------------------------------
  console.log('4. Menerbitkan 1 Agenda Riset Daerah Prioritas 2026...');
  const singleAgenda = await prisma.researchAgenda.create({
    data: {
      year: 2026,
      title: 'Strategi Percepatan Penurunan Stunting Terintegrasi Berbasis Intervensi Gizi dan Pangan Lokal Daerah',
      description: 'Kajian aksi terpadu lintas sektor (Dinas Kesehatan, Ketahanan Pangan, PUPR, dan Bappeda) untuk mengoptimalkan potensi komoditas pangan lokal berprotein tinggi dalam menekan prevalensi stunting balita di wilayah lokus prioritas daerah.',
      field: 'Kesehatan Masyarakat & Penanggulangan Stunting',
      allocatedBudgetCeiling: 150000000, // Rp 150 Juta DPA BRIDA
      isOpen: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      createdById: kepalaBrida.id
    }
  });
  console.log(`✓ 1 Agenda Riset Daerah diterbitkan: [${singleAgenda.id}] "${singleAgenda.title}" (Pagu: Rp 150.000.000)`);

  // Path berkas pendukung standar
  const samplePdfProposal = '/uploads/proposals/dokumen_proposal_resmi.pdf';
  const samplePdfCover = '/uploads/proposals/surat_pengantar_dekanat.pdf';
  const samplePdfRab = '/uploads/proposals/rincian_rab_sbm.pdf';
  const samplePdfPakta = '/uploads/proposals/pakta_integritas_materai.pdf';
  const slaDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------------------------
  // 5. MEMBUAT 5 USULAN KOMPETITIF BERBASIS AGENDA (AGENDA_COMPETITIVE)
  // ---------------------------------------------------------------------------
  console.log('5. Membuat 5 pengajuan usulan kompetitif untuk Agenda Riset Stunting...');

  const agendaProposalsData = [
    {
      num: 'PROP-2026-0001',
      researcherId: researcherUgm.id,
      title: 'Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir',
      focusArea: 'Kesehatan Masyarakat & Penanggulangan Stunting',
      targetLocation: 'Distrik Mimika Timur dan Distrik Mimika Barat',
      proposedBudget: 145000000,
      duration: 4,
      background: 'Tingginya angka stunting di wilayah pesisir belum tertangani tuntas karena pola konsumsi balita masih kekurangan mikronutrien esensial, padahal daerah memiliki biomassa sagu dan ikan gabus rawa yang kaya protein albumin dan asam amino esensial.',
      methodology: 'Metode eksperimental kuasi dengan desain pre-post test control group pada 80 balita kurus di 4 kampung pesisir, uji laboratorium formulasi biskuit MP-ASI sagu-ikan, dan pendampingan kader posyandu selama 90 hari.'
    },
    {
      num: 'PROP-2026-0002',
      researcherId: researcherItb.id,
      title: 'Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting',
      focusArea: 'Infrastruktur Wilayah, Permukiman & Penataan Ruang',
      targetLocation: 'Distrik Wania dan Distrik Kuala Kencana',
      proposedBudget: 135000000,
      duration: 3,
      background: 'Intervensi gizi spesifik seringkali gagal jika lingkungan tempat tinggal anak terkontaminasi bakteri tinja akibat ketiadaan jamban sehat dan air bersih layak minum, yang memicu diare kronis penyebab balita stunting.',
      methodology: 'Analisis spasial GIS pemetaan titik sanitasi buruk berbasis IoT water sensor, survei epidemiologis 120 kepala keluarga, dan penyusunan standard operating procedure (SOP) intervensi fisik sanitasi ramah lingkungan.'
    },
    {
      num: 'PROP-2026-0003',
      researcherId: researcherIpb.id,
      title: 'Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting',
      focusArea: 'Kelautan, Perikanan & Pemberdayaan Masyarakat Pesisir',
      targetLocation: 'Distrik Mimika Tengah',
      proposedBudget: 140000000,
      duration: 4,
      background: 'Wilayah perairan kaya akan tangkapan ikan kembung dan tenggiri bernilai omega-3 tinggi, namun angka wasting dan stunting anak nelayan tetap memprihatinkan karena rendahnya pengetahuan pengolahan PMT higienis ramah balita.',
      methodology: 'Riset aksi partisipatif (PAR) pembuatan konsentrat protein ikan (KPI) lokal, uji organoleptik makanan tambahan, dan evaluasi kenaikan kurva berat/tinggi badan balita sesuai standar WHO-NCHS.'
    },
    {
      num: 'PROP-2026-0004',
      researcherId: researcherUncen.id,
      title: 'Evaluasi Efektivitas Tata Kelola Alokasi Dana Desa (ADD) dalam Intervensi Penurunan Stunting Terintegrasi',
      focusArea: 'Tata Kelola Pemerintahan, Kebijakan Publik & Reformasi Birokrasi',
      targetLocation: 'Kawasan Kampung Pedalaman Distrik Jita dan Agimuga',
      proposedBudget: 120000000,
      duration: 3,
      background: 'Pemerintah telah mengamanatkan alokasi Dana Desa minimal 10% untuk penanganan stunting, namun eksekusi di lapangan kerap salah sasaran, tumpang tindih dengan BOK Dinas Kesehatan, atau tidak terserap akibat lemahnya regulasi desa.',
      methodology: 'Kajian kebijakan kualitatif-kuantitatif (mixed methods), audit kepatuhan penganggaran 15 kampung percontohan, Focus Group Discussion (FGD) lintas aparat distrik-kampung, dan perumusan draf Peraturan Bupati tentang Tata Kelola Keuangan Desa untuk Stunting.'
    },
    {
      num: 'PROP-2026-0005',
      researcherId: researcherUnipa.id,
      title: 'Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini',
      focusArea: 'Sosial, Kependudukan & Kebudayaan',
      targetLocation: 'Distrik Mimika Baru dan Distrik Iwaka',
      proposedBudget: 148000000,
      duration: 4,
      background: 'Kajian ini mengamati hubungan pola konsumsi olahan pati sagu tradisional terhadap pertumbuhan tinggi badan dan kecerdasan motorik balita di lingkungan pedesaan.',
      methodology: 'Studi observasional kohort prospektif pada 50 pasang ibu dan anak balita selama 12 minggu, pencatatan recall gizi 24 jam, dan analisis antropometri berkala.'
    }
  ];

  for (const item of agendaProposalsData) {
    await prisma.researchProposal.create({
      data: {
        proposalNumber: item.num,
        submissionType: 'AGENDA_COMPETITIVE',
        agendaId: singleAgenda.id,
        researcherId: item.researcherId,
        title: item.title,
        focusArea: item.focusArea,
        background: item.background,
        methodology: item.methodology,
        targetLocation: item.targetLocation,
        estimatedDurationMonths: item.duration,
        proposedBudget: item.proposedBudget,
        proposalFileUrl: samplePdfProposal,
        coverLetterUrl: samplePdfCover,
        rabFileUrl: samplePdfRab,
        integrityPactUrl: samplePdfPakta,
        status: 'SUBMITTED',
        slaDeadline: slaDeadline
      }
    });
    console.log(`  + [${item.num}] Agenda: ${item.title.substring(0, 50)}... (SUBMITTED)`);
  }

  // ---------------------------------------------------------------------------
  // 6. MEMBUAT 5 USULAN INISIATIF MANDIRI PENELITI (INITIATIVE)
  // ---------------------------------------------------------------------------
  console.log('6. Membuat 5 pengajuan usulan riset inisiatif mandiri peneliti...');

  const initiativeProposalsData = [
    {
      num: 'PROP-2026-0006',
      researcherId: researcherIpb.id,
      title: 'Kajian Daya Dukung Lingkungan dan Model Valuasi Ekonomi Jasa Ekosistem Hutan Mangrove Pesisir',
      focusArea: 'Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah',
      targetLocation: 'Pesisir Distrik Mimika Barat Jauh',
      proposedBudget: 88000000,
      duration: 3,
      background: 'Kerusakan hutan mangrove akibat penebangan liar kayu bakau dan alih fungsi lahan mengancam garis pantai dari abrasi, menurunkan tangkapan kepiting bakau nelayan, serta menghilangkan potensi nilai perdagangan karbon biru (blue carbon).',
      methodology: 'Metode Travel Cost Method (TCM) dan Contingent Valuation Method (CVM) untuk valuasi ekonomi, pemetaan citra satelit Sentinel-2 densitas kanopi mangrove, dan perumusan zona lindung pesisir.'
    },
    {
      num: 'PROP-2026-0007',
      researcherId: researcherItb.id,
      title: 'Rancang Bangun Pembangkit Listrik Pikohidro Portabel Berbasis Turbin Aliran Silang untuk Penerangan Kampung Terisolir',
      focusArea: 'Energi Terbarukan, Sains Terapan & Transformasi Digital',
      targetLocation: 'Distrik Tembagapura dan Distrik Hoya',
      proposedBudget: 95000000,
      duration: 4,
      background: 'Keterisolasian geografis wilayah pegunungan menyulitkan jaringan transmisi PLN menjangkau permukiman warga, padahal terdapat potensi aliran anak sungai berarus deras sepanjang tahun yang belum termanfaatkan.',
      methodology: 'Rekayasa manufaktur purwarupa turbin pikohidro 500-1000 Watt dengan material tahan korosi, uji debit hidrologi sungai, instalasi percontohan di 1 balai kampung, dan pelatihan operator pemeliharaan lokal.'
    },
    {
      num: 'PROP-2026-0008',
      researcherId: researcherUgm.id,
      title: 'Strategi Pengelolaan Sampah Perkotaan Terpadu Melalui Sirkular Ekonomi Berbasis Bank Sampah Unit Sekolah dan Pasar',
      focusArea: 'Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah',
      targetLocation: 'Wilayah Perkotaan Timika (Distrik Mimika Baru)',
      proposedBudget: 75000000,
      duration: 3,
      background: 'Volume timbulan sampah rumah tangga dan pasar tradisional yang masuk ke TPA telah melebihi kapasitas daya tampung harian, sehingga memicu pencemaran bau, lalat, dan resiko kebakaran tumpukan gas metana.',
      methodology: 'Karakterisasi komposisi sampah berdasarkan SNI 19-3964-1994, pemodelan sistem insentif tabungan sampah digital, dan penyusunan draf SOP pemilahan sampah hulu skala distrik.'
    },
    {
      num: 'PROP-2026-0009',
      researcherId: researcherUnipa.id,
      title: 'Model Hilirisasi Komoditas Kopi Arabika Dataran Tinggi Melalui Penguatan Rantai Pasok dan Kemitraan Koperasi Produsen',
      focusArea: 'Perekonomian, Perdagangan, UMKM & Keuangan Daerah',
      targetLocation: 'Lembah Pegunungan Distrik Alama dan Bela',
      proposedBudget: 82000000,
      duration: 4,
      background: 'Petani kopi lokal memiliki varietas kopi arabika kualitas speciality bernilai jual tinggi, namun rantai pemasaran terputus di tangan tengkulak dengan harga rendah akibat tidak adanya unit pengolahan basah (wet mill) dan sertifikasi indikasi geografis.',
      methodology: 'Value Chain Analysis (VCA), uji profil cita rasa (cupping test) standar SCAA, pendampingan legalitas koperasi produsen kopi, dan perumusan draf nota kesepahaman (MoU) kemitraan offtaker pasar modern.'
    },
    {
      num: 'PROP-2026-0010',
      researcherId: researcherUncen.id,
      title: 'Penguatan Peran Lembaga Musyawarah Adat dalam Mediasi Sengketa Ulayat Tanah untuk Kepastian Investasi Daerah',
      focusArea: 'Tata Kelola Pemerintahan, Kebijakan Publik & Reformasi Birokrasi',
      targetLocation: 'Kawasan Pengembangan Wilayah Distrik Kuala Kencana dan Iwaka',
      proposedBudget: 79000000,
      duration: 3,
      background: 'Ketidakpastian batas tanah adat dan klaim kepemilikan ganda seringkali memicu konflik horizontal antar marga dan menghambat proyek strategis infrastruktur daerah, sementara putusan pengadilan formal kerap tidak diterima secara sosiologis.',
      methodology: 'Pendekatan socio-legal research, pemetaan silsilah dan batas hak ulayat berbasis partisipatif (participatory boundary mapping), mediasi restoratif hukum adat, dan draf rekomendasi Perbup Pedoman Peradilan Perdamaian Adat.'
    }
  ];

  for (const item of initiativeProposalsData) {
    await prisma.researchProposal.create({
      data: {
        proposalNumber: item.num,
        submissionType: 'INITIATIVE',
        agendaId: null,
        researcherId: item.researcherId,
        title: item.title,
        focusArea: item.focusArea,
        background: item.background,
        methodology: item.methodology,
        targetLocation: item.targetLocation,
        estimatedDurationMonths: item.duration,
        proposedBudget: item.proposedBudget,
        proposalFileUrl: samplePdfProposal,
        coverLetterUrl: samplePdfCover,
        rabFileUrl: samplePdfRab,
        integrityPactUrl: samplePdfPakta,
        status: 'SUBMITTED',
        slaDeadline: slaDeadline
      }
    });
    console.log(`  + [${item.num}] Inisiatif: ${item.title.substring(0, 50)}... (SUBMITTED)`);
  }

  console.log('===============================================================');
  console.log('✓ RESET & SEEDING SELESAI 100% SUKSES!');
  console.log('  Total Agenda: 1 Agenda Aktif');
  console.log('  Total Usulan Kompetitif Agenda: 5 Proposal (PROP-2026-0001 s/d 0005)');
  console.log('  Total Usulan Inisiatif Mandiri: 5 Proposal (PROP-2026-0006 s/d 0010)');
  console.log('  Seluruh berkas dokumen (Proposal, Surat, RAB, Pakta) aktif & dapat dibuka.');
  console.log('  Semua proposal berstatus SUBMITTED siap ditelaah Gerbang 1 & Asisten AI.');
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
