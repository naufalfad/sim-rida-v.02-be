/**
 * AI Copilot Service untuk SIMRIDA v2.0
 * Modul Analisis Cerdas Gerbang 1: Uji Administrasi, Kepatuhan SBM, Audit Berkas Fisik (PDF & Excel), & Anti-Duplikasi Arsip
 * (Token-Efficient, Fast, & Grounded to Regional Government Standards)
 */

const { auditProposalFiles } = require('../../utils/fileExtractor');

const analyzeGate1WithAI = async ({ proposal, priorResearches = [], rpjmdList = [], opdList = [] }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY belum dikonfigurasi di file .env backend.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const isAgendaBased = proposal.submissionType === 'AGENDA_COMPETITIVE' || Boolean(proposal.agendaId);

  // 1. Ekstraksi dan Audit Berkas Fisik (PDF & Excel) secara lokal di server (0 Token AI)
  const localFilesAudit = await auditProposalFiles(proposal);

  // 2. Format referensi HANYA arsip riset masa lalu (COMPLETED)
  const priorContext = priorResearches.length > 0
    ? priorResearches.map((p, idx) => `${idx + 1}. [${p.proposalNumber}] "${p.title}" (${p.focusArea || 'Umum'})`).join('\n')
    : 'Bank data arsip kajian terdahulu masih kosong / belum ada riset lampau dengan tema serupa.';

  // 3. Format opsi RPJMD & OPD
  const rpjmdOptions = rpjmdList.length > 0
    ? rpjmdList.map((r) => r.name).join(', ')
    : 'Penanggulangan Kemiskinan Ekstrem & Penurunan Stunting, Kemandirian Pangan Lokal & Ketahanan Iklim, Peningkatan Kualitas SDM & Layanan Kesehatan, Pemberdayaan Ekonomi Kerakyatan & UMKM';

  const opdOptions = opdList.length > 0
    ? opdList.map((o) => o.shortName || o.name).join(', ')
    : 'Bappeda, Dinas Kesehatan, Dinas Pendidikan, Dinas PUPR, Dinas Pertanian & Ketahanan Pangan, Dinas Perikanan, Dinas Lingkungan Hidup, Dinas Perindag, Dinas Koperasi/UMKM';

  // 4. Potong teks panjang untuk efisiensi token (< 600 karakter)
  const safeBackground = (proposal.background || '').substring(0, 600);
  const safeMethodology = (proposal.methodology || '').substring(0, 600);
  const formattedProposedBudget = `Rp ${Number(proposal.proposedBudget || 0).toLocaleString('id-ID')}`;

  // 5. Susun ringkasan hasil audit fisik untuk disuntikkan ke prompt AI (~250 token)
  const filesAuditSummary = `
HASIL AUDIT BERKAS FISIK & DOKUMEN ASLI DARI SERVER (PDF & EXCEL):
1. Naskah Proposal (${localFilesAudit.proposalDoc?.format || 'PDF'}): Status: ${localFilesAudit.proposalDoc?.status || 'UNKNOWN'}, Jumlah Kata: ${localFilesAudit.proposalDoc?.wordCount || 0}.
   - Cuplikan Isi Berkas: "${localFilesAudit.proposalDoc?.excerpt || '-'}"
   - Korelasi terhadap Judul Usulan: ${localFilesAudit.proposalDoc?.titleCorrelation ? 'SESUAI (Memuat kata kunci tema riset)' : 'PELANGGARAN: TIDAK BERKORELASI (0 kata kunci judul cocok, berkas terindikasi dummy/placeholder)'}
2. Rincian RAB (${localFilesAudit.rabDoc?.format || 'PDF/EXCEL'}): Status: ${localFilesAudit.rabDoc?.status || 'UNKNOWN'}.
   - Total di Berkas RAB: ${localFilesAudit.rabDoc?.extractedTotalFormatted || 'TIDAK DITEMUKAN ANGKA TOTAL / TABEL RINCIAN BIAYA'}
   - Anggaran Isian Form: ${localFilesAudit.rabDoc?.formProposedBudgetFormatted || formattedProposedBudget}
   - Keberadaan Angka Biaya: ${localFilesAudit.rabDoc?.hasValidCostFigures ? 'Memuat angka nominal biaya' : 'PELANGGARAN KERAS: Berkas tidak memuat angka biaya sama sekali (berkas dummy/kosong tanpa angka)'}
   - Diskrepansi Selisih Anggaran: ${localFilesAudit.rabDoc?.isDiscrepancy ? 'PERINGATAN KERAS: Selisih ' + localFilesAudit.rabDoc?.budgetDiscrepancyFormatted : 'Sesuai / Angka sinkron'}
   - Belanja Modal Aset Terlarang: ${localFilesAudit.rabDoc?.hasProhibitedItems ? 'DITEMUKAN POS TERLARANG: ' + localFilesAudit.rabDoc?.prohibitedItems.join(', ') : 'Bersih / Bebas belanja modal terlarang'}
   - Cuplikan Isi Berkas: "${localFilesAudit.rabDoc?.excerpt || '-'}"
3. Surat Pengantar Institusi (${localFilesAudit.coverLetterDoc?.format || 'PDF'}): Status: ${localFilesAudit.coverLetterDoc?.status || 'UNKNOWN'} (${localFilesAudit.coverLetterDoc?.notes || '-'}).
4. Pakta Integritas Bermaterai (${localFilesAudit.integrityPactDoc?.format || 'PDF'}): Status: ${localFilesAudit.integrityPactDoc?.status || 'UNKNOWN'} (${localFilesAudit.integrityPactDoc?.notes || '-'}).
Ringkasan Temuan Audit Server: ${localFilesAudit.auditFlags.length > 0 ? localFilesAudit.auditFlags.join(' | ') : 'Semua berkas lengkap, otentik, dan sesuai standar birokrasi.'}
`;

  let prompt = '';

  if (isAgendaBased) {
    // =========================================================================
    // PROMPT KHUSUS USULAN AGENDA RISET DAERAH (KOMPETITIF)
    // =========================================================================
    const agendaTitle = proposal.agenda?.title || 'Agenda Riset Prioritas Daerah';
    const agendaField = proposal.agenda?.field || proposal.focusArea || 'Kesehatan/Sosial';
    const agendaCeiling = proposal.agenda?.allocatedBudgetCeiling
      ? `Rp ${Number(proposal.agenda.allocatedBudgetCeiling).toLocaleString('id-ID')}`
      : 'Rp 150.000.000';

    prompt = `
Anda adalah Analis Litbangda Senior di Badan Riset dan Inovasi Daerah (BRIDA) Pemerintah Daerah.
Tugas Anda: Melakukan Uji Administratif, Kepatuhan Regulasi, & Audit Berkas Fisik Gerbang 1 untuk Usulan yang TERIKAT AGENDA RISET DAERAH.

KONTEKS AGENDA INDUK BRIDA:
- Judul Agenda: "${agendaTitle}"
- Bidang Agenda: "${agendaField}"
- Pagu Maksimal DPA BRIDA: ${agendaCeiling}

DATA PROPOSAL PENELITI:
- Nomor Usulan: ${proposal.proposalNumber}
- Judul Proposal: "${proposal.title}"
- Instansi Pengusul: ${proposal.researcher?.institutionName || 'Lembaga Peneliti'}
- Lokus Kajian: "${proposal.targetLocation || '-'}"
- Durasi Pengerjaan: ${proposal.estimatedDurationMonths || 3} Bulan
- Usulan Biaya (RAB): ${formattedProposedBudget}
- Ringkasan Urgensi: "${safeBackground}"
- Ringkasan Metodologi: "${safeMethodology}"

${filesAuditSummary}

ARSIP KAJIAN TERDAHULU DI PEMDA (Hanya untuk Cek Jiplakan/Duplikasi Masa Lalu):
${priorContext}

DAFTAR PERANGKAT DAERAH (OPD) TERKAIT:
${opdOptions}

INSTRUKSI EVALUASI GERBANG 1 (ADMINISTRATIF & REGULATIF):
1. Uji Anti-Duplikasi Arsip: Bandingkan proposal ini HANYA terhadap arsip kajian terdahulu di atas (JANGAN membandingkan dengan sesama proposal kompetitor aktif tahun ini). Tentukan: "UNIQUE" (Orisinil) atau "SIMILAR_EXIST" (Pernah ada kajian masa lalu yang mirip). Estimasi kemiripan 0-100%.
2. Audit Keabsahan Berkas Fisik:
   - Evaluasi apakah naskah proposal terindikasi "file bodong" / dummy atau naskah ilmiah substantif. Jika isi berkas tidak memuat kata kunci judul usulan ("${proposal.title}") atau hanya template bawaan, tandai sebagai berkas dummy!
   - Periksa kepatuhan RAB terhadap SBM: Jika berkas RAB TIDAK memuat angka rincian biaya, atau ada belanja modal terlarang (laptop, hp, motor, mobil), atau ada selisih nominal signifikan, tandai sebagai PELANGGARAN KERAS!
   - Periksa keabsahan surat pengantar dan pakta integritas bermaterai.
3. Keselarasan KAK Agenda: Berikan ulasan 1-2 kalimat apakah ruang lingkup yang ditawarkan peneliti menjawab mandat KAK Agenda Induk.
4. Kepatuhan Pagu DPA: Bandingkan RAB (${formattedProposedBudget}) dengan Pagu DPA (${agendaCeiling}).
5. ATURAN MUTLAK STATUS KEPATUHAN ADMINISTRASI & AUDIT BERKAS:
   - JIKA ADA BERKAS DUMMY, RAB TANPA ANGKA, KETIDAKSESUAIAN JUDUL, ATAU BELANJA MODAL TERLARANG:
     * "administrativeCompliance.status" WAJIB diisi "DEFECTIVE"
     * "filesAuditEvaluation.status" WAJIB diisi "DEFECTIVE"
     * "draftAdminNotes" WAJIB merekomendasikan: "Usulan digugurkan pada Gerbang 1 (Gugur Administrasi) karena dokumen yang diunggah terindikasi berkas dummy/placeholder dan RAB tidak memuat rincian angka biaya yang sah."
   - JIKA SEMUA BERKAS OTENTIK, MEMILIKI SUBSTANSI NYATA, ANGKA RAB SINKRON, DAN BEBAS BELANJA MODAL:
     * "administrativeCompliance.status" diisi "COMPLIANT"
     * "filesAuditEvaluation.status" diisi "VALID"
   - "NEEDS_ATTENTION" hanya untuk catatan minor yang tidak fatal.
6. Pemetaan OPD Lintas Sektor: Tentukan Lead OPD dan 1-3 OPD pendukung yang relevan.
7. Draft Catatan Verifikator: Kalimat pertimbangan resmi staf administrasi BRIDA (2-3 kalimat lugas dan formal).

KEMBALIKAN HANYA OBJEK JSON:
{
  "submissionType": "AGENDA_COMPETITIVE",
  "duplicationStatus": "UNIQUE" | "SIMILAR_EXIST" | "DUPLICATE",
  "similarityScore": <angka 0-100>,
  "matchedResearchRef": "<Nomor/Judul arsip terdahulu jika mirip, atau kosongkan>",
  "noveltyNotes": "<Ulasan nilai pembeda / kebaruan pendekatan yang diajukan peneliti>",
  "administrativeCompliance": {
    "status": "COMPLIANT" | "NEEDS_ATTENTION" | "DEFECTIVE",
    "sbmBudgetCheck": "<Analisis kepatuhan pagu RAB terhadap DPA & SBM daerah>",
    "timelineFeasibility": "<Ulasan kewajaran durasi pengerjaan terhadap target lokus>",
    "kakAlignmentNotes": "<Ulasan keselarasan terhadap KAK agenda induk>"
  },
  "filesAuditEvaluation": {
    "status": "VALID" | "DEFECTIVE" | "NEEDS_ATTENTION",
    "proposalFileNotes": "<Ulasan keabsahan isi berkas naskah proposal>",
    "rabFileNotes": "<Ulasan keabsahan berkas RAB (sinkronisasi angka, bebas laptop/hp/motor)>",
    "coverLetterNotes": "<Ulasan surat pengantar pimpinan>",
    "integrityPactNotes": "<Ulasan pakta integritas bermaterai>"
  },
  "suggestedRpjmdTag": "Sesuai Agenda Prioritas Daerah: ${agendaField}",
  "suggestedLeadOpd": "<Nama OPD Pengampu Utama>",
  "suggestedCrossCuttingOpds": ["<OPD 1>", "<OPD 2>"],
  "draftAdminNotes": "<Rancangan catatan telaah staf administrasi Gerbang 1>",
  "executiveSummaryForReviewer": "<Ringkasan 2-3 kalimat untuk pengantar ke Tim Reviewer Gerbang 2>"
}
`;
  } else {
    // =========================================================================
    // PROMPT KHUSUS USULAN INISIATIF MANDIRI PENELITI (BOTTOM-UP)
    // =========================================================================
    prompt = `
Anda adalah Analis Litbangda Senior di Badan Riset dan Inovasi Daerah (BRIDA) Pemerintah Daerah.
Tugas Anda: Melakukan Uji Administratif, Pemetaan Lintas Urusan, & Audit Berkas Fisik Gerbang 1 untuk USULAN INISIATIF MANDIRI PENELITI (Bottom-Up).

DATA PROPOSAL PENELITI:
- Nomor Usulan: ${proposal.proposalNumber}
- Judul Proposal: "${proposal.title}"
- Bidang Kajian: "${proposal.focusArea || '-'}"
- Instansi Pengusul: ${proposal.researcher?.institutionName || 'Lembaga Peneliti'}
- Lokus Kajian: "${proposal.targetLocation || '-'}"
- Durasi Pengerjaan: ${proposal.estimatedDurationMonths || 3} Bulan
- Usulan Biaya (RAB): ${formattedProposedBudget}
- Ringkasan Urgensi: "${safeBackground}"
- Ringkasan Metodologi: "${safeMethodology}"

${filesAuditSummary}

ARSIP KAJIAN TERDAHULU DI PEMDA (Pengecekan Duplikasi Masa Lalu):
${priorContext}

DAFTAR PILIHAN PRIORITAS RPJMD DAERAH:
${rpjmdOptions}

DAFTAR PILIHAN PERANGKAT DAERAH (OPD) PEMDA:
${opdOptions}

INSTRUKSI EVALUASI GERBANG 1 (ADMINISTRATIF & PEMETAAN):
1. Uji Anti-Duplikasi Arsip: Bandingkan proposal ini HANYA terhadap arsip kajian terdahulu di atas. Tentukan: "UNIQUE" (Orisinil) atau "SIMILAR_EXIST" (Mirip riset masa lalu). Estimasi kemiripan 0-100%.
2. Audit Keabsahan Berkas Fisik:
   - Evaluasi apakah naskah proposal terindikasi "file bodong" / dummy atau naskah ilmiah substantif. Jika naskah proposal tidak memuat kata kunci judul usulan ("${proposal.title}") atau hanya template bawaan, tandai sebagai berkas dummy!
   - Periksa kepatuhan RAB terhadap SBM: Jika berkas RAB TIDAK memuat angka rincian biaya atau tabel nominal, atau ada belanja modal terlarang (laptop, hp, motor, mobil), tandai sebagai PELANGGARAN KERAS!
   - Periksa keabsahan surat pengantar dan pakta integritas bermaterai.
3. Pemetaan RPJMD: Pilih SATU nama prioritas RPJMD yang paling selaras dari daftar di atas.
4. Pemetaan Multi-OPD: Tentukan SATU Lead OPD (Dinas Pengampu Utama) dan 1-3 OPD pendukung lintas urusan.
5. Kepatuhan Anggaran (SBM): Analisis kewajaran biaya terhadap ruang lingkup riset.
6. ATURAN MUTLAK STATUS KEPATUHAN ADMINISTRASI & AUDIT BERKAS:
   - JIKA ADA BERKAS DUMMY, RAB TANPA TABEL ANGKA, KETIDAKSESUAIAN JUDUL, ATAU BELANJA MODAL TERLARANG:
     * "administrativeCompliance.status" WAJIB diisi "DEFECTIVE"
     * "filesAuditEvaluation.status" WAJIB diisi "DEFECTIVE"
     * "draftAdminNotes" WAJIB merekomendasikan penolakan: "Usulan digugurkan pada Gerbang 1 (Gugur Administrasi) karena dokumen yang diunggah terindikasi berkas dummy/placeholder dan RAB tidak memuat rincian angka biaya yang sah."
   - JIKA SEMUA BERKAS OTENTIK, MEMILIKI SUBSTANSI NYATA, ANGKA RAB SINKRON, DAN BEBAS BELANJA MODAL:
     * "administrativeCompliance.status" diisi "COMPLIANT"
     * "filesAuditEvaluation.status" diisi "VALID"
   - "NEEDS_ATTENTION" hanya untuk catatan minor yang tidak fatal.
7. Draft Catatan Verifikator: Kalimat pertimbangan resmi staf administrasi BRIDA (2-3 kalimat lugas dan formal).

KEMBALIKAN HANYA OBJEK JSON:
{
  "submissionType": "INITIATIVE",
  "duplicationStatus": "UNIQUE" | "SIMILAR_EXIST" | "DUPLICATE",
  "similarityScore": <angka 0-100>,
  "matchedResearchRef": "<Nomor/Judul arsip terdahulu jika mirip, atau kosongkan>",
  "noveltyNotes": "<Ulasan aspek kebaruan dan urgensi yang diusulkan>",
  "administrativeCompliance": {
    "status": "COMPLIANT" | "NEEDS_ATTENTION" | "DEFECTIVE",
    "sbmBudgetCheck": "<Analisis kepatuhan RAB terhadap standar biaya masukan daerah>",
    "timelineFeasibility": "<Ulasan kewajaran durasi pengerjaan terhadap target lokus>"
  },
  "filesAuditEvaluation": {
    "status": "VALID" | "DEFECTIVE" | "NEEDS_ATTENTION",
    "proposalFileNotes": "<Ulasan keabsahan isi berkas naskah proposal>",
    "rabFileNotes": "<Ulasan keabsahan berkas RAB (sinkronisasi angka, bebas laptop/hp/motor)>",
    "coverLetterNotes": "<Ulasan surat pengantar pimpinan>",
    "integrityPactNotes": "<Ulasan pakta integritas bermaterai>"
  },
  "suggestedRpjmdTag": "<Nama salah satu prioritas RPJMD dari daftar>",
  "suggestedLeadOpd": "<Nama OPD Pengampu Utama>",
  "suggestedCrossCuttingOpds": ["<OPD 1>", "<OPD 2>"],
  "draftAdminNotes": "<Rancangan catatan telaah staf administrasi Gerbang 1>",
  "executiveSummaryForReviewer": "<Ringkasan 2-3 kalimat untuk pengantar ke Tim Reviewer Gerbang 2>"
}
`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah analis verifikator administrasi litbang daerah BRIDA. Berikan respon HANYA dalam format JSON murni tanpa markdown formatting backtick.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Gagal menerima respon teks dari OpenAI.');
  }

  const parsed = JSON.parse(rawContent);

  // Gabungkan hasil audit berkas fisik dari server lokal dengan hasil penalaran AI
  parsed.filesPhysicalAudit = localFilesAudit;
  parsed.modelUsed = model;
  parsed.usage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0
  };

  return parsed;
};

/**
 * AI Copilot Service Gerbang 2 - SELEKSI KOMPETITIF BATCH PER-AGENDA
 * Menilai dan memeringkat seluruh proposal yang bersaing pada satu Agenda Riset secara komparatif.
 */
const analyzeGate2AgendaBatchWithAI = async ({ agenda, proposals = [], fiscalBudget = null }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY belum dikonfigurasi di file .env backend.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Format ringkasan proposal kompetitor (padat dan hemat token, max 350 karakter per proposal)
  const proposalsText = proposals
    .map((p, idx) => {
      const safeBg = (p.background || '').substring(0, 350).replace(/\n/g, ' ');
      const safeMethod = (p.methodology || '').substring(0, 350).replace(/\n/g, ' ');
      const rab = `Rp ${Number(p.proposedBudget || 0).toLocaleString('id-ID')}`;
      return `[PESERTA ${idx + 1}]
- ID: ${p.id}
- Nomor Usulan: ${p.proposalNumber}
- Judul: "${p.title}"
- Instansi / Peneliti: ${p.researcher?.institutionName || 'Peneliti'} (${p.researcher?.name || '-'})
- Lokus Sasaran: ${p.targetLocation || '-'} | Durasi: ${p.estimatedDurationMonths || 3} Bulan
- Usulan Biaya (RAB): ${rab}
- Ringkasan Latar Belakang: "${safeBg}"
- Ringkasan Metodologi: "${safeMethod}"`;
    })
    .join('\n---\n');

  const ceilingFormatted = agenda.allocatedBudgetCeiling
    ? `Rp ${Number(agenda.allocatedBudgetCeiling).toLocaleString('id-ID')}`
    : 'Rp 150.000.000';

  const fiscalInfo = fiscalBudget
    ? `Pagu Kas Khusus Agenda BRIDA: Rp ${Number(fiscalBudget.agendaAllocation || 0).toLocaleString('id-ID')} (Sisa Kas: Rp ${Number(fiscalBudget.remainingAgenda || 0).toLocaleString('id-ID')})`
    : 'Pagu Kas Induk BRIDA: Sesuai plafon DPA agenda.';

  const prompt = `
Anda adalah Ketua Dewan Pakar Reviewer Litbangda BRIDA yang bertugas melakukan SELEKSI KOMPETITIF & PENETAPAN PEMENANG GERBANG 2 untuk Agenda Riset Prioritas Daerah.

KONTEKS AGENDA RISET DAERAH:
- Judul Agenda: "${agenda.title}"
- Bidang Tematik: "${agenda.field}"
- Ruang Lingkup Masalah / Kebutuhan Daerah: "${agenda.description || '-'}"
- Plafon Pagu Maksimal DPA BRIDA: ${ceilingFormatted}
- Konteks Fiskal Kas: ${fiscalInfo}

DAFTAR USULAN PENELITI YANG BERSAING (${proposals.length} Proposal):
${proposalsText}

TUGAS ANDA SEBAGAI TIM REVIEWER GERBANG 2:
Lakukan penilaian komparatif (head-to-head) untuk setiap proposal berdasarkan Rubrik 4 Pilar Berbobot SIMRIDA:
1. K1: Mutu Ilmiah & Metodologi (Bobot 25%) - Skala 1-100: Ketajaman analisis masalah, validitas teknik sampling, instrumen pengumpulan data.
2. K2: Relevansi dengan Kebutuhan Daerah (Bobot 35% - Bobot Tertinggi) - Skala 1-100: Seberapa presisi usulan menjawab ruang lingkup masalah agenda induk di atas.
3. K3: Aplikabilitas Rekomendasi Kebijakan (Bobot 25%) - Skala 1-100: Kemudahan rekomendasi diterjemahkan menjadi dokumen kebijakan teknis pemda.
4. K4: Kelayakan Anggaran & Jadwal (Bobot 15%) - Skala 1-100: Rasionalitas biaya terhadap output dan kepatutan pagu DPA.

Kalkulasi Skor Tertimbang: (K1 * 0.25) + (K2 * 0.35) + (K3 * 0.25) + (K4 * 0.15).
Tentukan PERINGKAT (Rank 1, 2, 3, ...) secara objektif. Peringkat 1 adalah kandidat pemenang utama (#1 Awardee).

KEMBALIKAN HANYA OBJEK JSON DENGAN STRUKTUR:
{
  "agendaId": "${agenda.id}",
  "totalCompetitors": ${proposals.length},
  "winnerProposalNumber": "<Nomor usulan pemenang peringkat 1>",
  "executiveRationale": "<Ulasan komparatif 2-3 kalimat mengapa usulan peringkat 1 terpilih mengungguli kompetitor lainnya>",
  "evaluations": [
    {
      "proposalId": "<id proposal>",
      "proposalNumber": "<nomor proposal>",
      "rank": <angka 1, 2, dst>,
      "isWinner": <true jika rank 1, false jika lainnya>,
      "scoreScientificQuality": <angka 1-100>,
      "scoreOpdRelevance": <angka 1-100>,
      "scorePolicyApplicability": <angka 1-100>,
      "scoreBudgetFeasibility": <angka 1-100>,
      "weightedScore": <angka desimal dua angka di belakang koma>,
      "recommendation": "RECOMMENDED" | "NOT_RECOMMENDED",
      "competitiveAdvantage": "<Keunggulan utama pendekatan peneliti ini dibanding peserta lain>",
      "criticalWeakness": "<Kelemahan atau celah metodologi yang harus diperbaiki>",
      "opdRelevanceNotes": "<Catatan ulasan telaah resmi reviewer Gerbang 2 untuk dicantumkan di formulir>"
    }
  ]
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah Dewan Pakar Ilmiah dan Reviewer Senior Litbangda BRIDA. Berikan evaluasi komparatif yang tajam dan objektif. Balas HANYA dengan JSON murni tanpa markdown formatting backtick.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Gagal menerima respon teks dari OpenAI.');
  }

  const parsed = JSON.parse(rawContent);

  // Enforce deterministic exact formula calculation for all batch evaluations
  // Blueprint Bab 4.3: (K1*0.25) + (K2*0.35) + (K3*0.25) + (K4*0.15)
  if (Array.isArray(parsed.evaluations)) {
    parsed.evaluations.forEach((ev) => {
      const k1 = Number(ev.scoreScientificQuality) || 0;
      const k2 = Number(ev.scoreOpdRelevance) || 0;
      const k3 = Number(ev.scorePolicyApplicability) || 0;
      const k4 = Number(ev.scoreBudgetFeasibility) || 0;
      ev.weightedScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
      ev.meetsPassingGrade = ev.weightedScore >= 70;
      if (!ev.recommendation) {
        ev.recommendation = ev.weightedScore >= 70 ? 'RECOMMENDED' : 'NOT_RECOMMENDED';
      }
    });

    // Re-sort evaluations by exact weightedScore descending to ensure correct ranking
    parsed.evaluations.sort((a, b) => b.weightedScore - a.weightedScore);
    parsed.evaluations.forEach((ev, idx) => {
      ev.rank = idx + 1;
      ev.isWinner = idx === 0;
    });

    if (parsed.evaluations[0]) {
      parsed.winnerProposalNumber = parsed.evaluations[0].proposalNumber;
    }
  }

  parsed.modelUsed = model;
  parsed.usage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0
  };

  return parsed;
};

/**
 * AI Copilot Service Gerbang 2 - EVALUASI TUNGGAL USULAN INISIATIF MANDIRI
 * Menguji kepatutan ilmiah, keselarasan RPJMD/Tupoksi OPD, dan rasio beban kas fiskal terhadap passing grade 70.00.
 */
const analyzeGate2InitiativeWithAI = async ({ proposal, fiscalBudget = null, policyInstruments = [] }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY belum dikonfigurasi di file .env backend.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const safeBg = (proposal.background || '').substring(0, 500);
  const safeMethod = (proposal.methodology || '').substring(0, 500);
  const proposedBudget = Number(proposal.proposedBudget || 0);
  const formattedBudget = `Rp ${proposedBudget.toLocaleString('id-ID')}`;

  const remainingInitiative = fiscalBudget
    ? Number(fiscalBudget.remainingInitiative || fiscalBudget.initiativeAllocation || 750000000)
    : 750000000;
  const fiscalImpactPercent = remainingInitiative > 0
    ? Number(((proposedBudget / remainingInitiative) * 100).toFixed(1))
    : 0;

  const fiscalContext = `
- Sisa Pagu Kas Inisiatif BRIDA TA 2026: Rp ${remainingInitiative.toLocaleString('id-ID')}
- Usulan Biaya Peneliti: ${formattedBudget}
- Rasio Beban Fiskal Usulan: ${fiscalImpactPercent}% dari sisa kuota kas inisiatif
`;

  const policyOptions = policyInstruments.length > 0
    ? policyInstruments.map((p) => p.name).join(', ')
    : 'Naskah Akademik Raperda, Raperbup (Peraturan Bupati), Matriks Program Renja OPD, SOP Teknis Lapangan, Roadmap Kebijakan';

  const prompt = `
Anda adalah Anggota Tim Reviewer Litbangda BRIDA yang mengevaluasi KELAYAKAN SUBSTANTIF GERBANG 2 untuk USULAN INISIATIF MANDIRI PENELITI (Bottom-Up).

DATA USULAN RISET PENELITI:
- Nomor Usulan: ${proposal.proposalNumber}
- Judul Usulan: "${proposal.title}"
- Bidang Kajian: "${proposal.focusArea || '-'}"
- Instansi / Peneliti: ${proposal.researcher?.institutionName || 'Lembaga Pengusul'} (${proposal.researcher?.name || '-'})
- Lokus Sasaran: "${proposal.targetLocation || '-'}"
- Durasi: ${proposal.estimatedDurationMonths || 3} Bulan
- Isu RPJMD Terkait (Dari Gerbang 1): "${proposal.adminRpjmdThematicTag || '-'}"
- OPD Pengampu Terkait (Dari Gerbang 1): "${proposal.adminCrossCuttingOpdTags || '-'}"
- Usulan Biaya (RAB): ${formattedBudget}
- Ringkasan Latar Belakang: "${safeBg}"
- Ringkasan Metodologi: "${safeMethod}"

KONTEKS KAPASITAS FISKAL KAS BRIDA:
${fiscalContext}

PILIHAN BENTUK INSTRUMEN REGULASI / KEBIJAKAN DAERAH:
${policyOptions}

TUGAS REVIEWER GERBANG 2:
Nilai usulan mandiri ini berdasarkan Rubrik 4 Pilar Berbobot SIMRIDA (Passing Grade >= 70.00):
1. K1: Mutu Ilmiah & Metodologi (Bobot 25%) - Skala 1-100: Kedalaman teoritis, ketepatan metode survei/eksperimen, keterukuran parameter.
2. K2: Relevansi dengan Isu RPJMD & Tupoksi OPD (Bobot 35% - Terbesar) - Skala 1-100: Seberapa mendesak usulan ini menyelesaikan problem riil daerah, bukan sekadar kajian teoritis menara gading.
3. K3: Aplikabilitas Rekomendasi Kebijakan (Bobot 25%) - Skala 1-100: Kemudahan rekomendasi diterjemahkan menjadi Perda/Perbup/Renja.
4. K4: Kelayakan Anggaran & Nilai Manfaat (Bobot 15%) - Skala 1-100: Rasionalitas biaya terhadap output dan kewajaran rasio beban fiskal (${fiscalImpactPercent}% terhadap kas inisiatif).

KEMBALIKAN HANYA OBJEK JSON DENGAN STRUKTUR:
{
  "proposalId": "${proposal.id}",
  "proposalNumber": "${proposal.proposalNumber}",
  "scoreScientificQuality": <angka 1-100>,
  "scoreOpdRelevance": <angka 1-100>,
  "scorePolicyApplicability": <angka 1-100>,
  "scoreBudgetFeasibility": <angka 1-100>,
  "weightedScore": <angka desimal 2 angka di belakang koma>,
  "recommendation": "RECOMMENDED" | "NOT_RECOMMENDED",
  "recommendedPolicyInstrument": "<Pilih salah satu dari instrumen di atas>",
  "fiscalImpactEvaluation": {
    "fiscalImpactPercent": ${fiscalImpactPercent},
    "isHighFiscalRisk": <true jika fiscalImpactPercent > 40, false jika aman>,
    "notes": "<Ulasan apakah biaya sepadan dengan manfaat strategis daerah atau terlalu menguras kas>"
  },
  "scientificMethodNotes": "<Ulasan ketepatan metodologi dan catatan sampling>",
  "policyAdoptionNotes": "<Ulasan bagaimana OPD dapat mengadopsi hasil riset ini>",
  "opdRelevanceNotes": "<Rancangan catatan telaah resmi reviewer Gerbang 2 untuk dicantumkan di formulir>"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah Reviewer Senior Litbangda BRIDA yang mengevaluasi kelayakan proposal inisiatif. Balas HANYA dengan JSON murni tanpa markdown formatting backtick.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Gagal menerima respon teks dari OpenAI.');
  }

  const parsed = JSON.parse(rawContent);

  // Enforce deterministic exact formula calculation for single initiative
  // Blueprint Bab 4.3: (K1*0.25) + (K2*0.35) + (K3*0.25) + (K4*0.15)
  const k1 = Number(parsed.scoreScientificQuality) || 0;
  const k2 = Number(parsed.scoreOpdRelevance) || 0;
  const k3 = Number(parsed.scorePolicyApplicability) || 0;
  const k4 = Number(parsed.scoreBudgetFeasibility) || 0;
  parsed.weightedScore = Number(((k1 * 0.25) + (k2 * 0.35) + (k3 * 0.25) + (k4 * 0.15)).toFixed(2));
  parsed.meetsPassingGrade = parsed.weightedScore >= 70;
  if (!parsed.recommendation) {
    parsed.recommendation = parsed.meetsPassingGrade ? 'RECOMMENDED' : 'NOT_RECOMMENDED';
  }

  parsed.modelUsed = model;
  parsed.usage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0
  };

  return parsed;
};

module.exports = {
  analyzeGate1WithAI,
  analyzeGate2AgendaBatchWithAI,
  analyzeGate2InitiativeWithAI
};
