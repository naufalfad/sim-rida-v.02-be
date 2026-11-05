const { auditProposalFiles } = require('../src/utils/fileExtractor');

async function main() {
  const testCases = [
    // AGENDA 1
    {
      proposalNumber: 'PROP-2026-0001',
      title: 'Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir',
      proposedBudget: 145000000,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0001.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0001.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ugm.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ugm.pdf'
    },
    // AGENDA 2
    {
      proposalNumber: 'PROP-2026-0002',
      title: 'Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting',
      proposedBudget: 135000000,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0002.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0002.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_itb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_itb.pdf'
    },
    // AGENDA 3
    {
      proposalNumber: 'PROP-2026-0003',
      title: 'Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting',
      proposedBudget: 140000000,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0003.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0003.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ipb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ipb.pdf'
    },
    // AGENDA 4
    {
      proposalNumber: 'PROP-2026-0005',
      title: 'Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini',
      proposedBudget: 148000000,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0005.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0005.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_unipa.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_unipa.pdf'
    },
    // AGENDA 5
    {
      proposalNumber: 'PROP-2026-0011',
      title: 'Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman',
      proposedBudget: 138000000,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0011.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0011.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_uncen.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_uncen.pdf'
    },
    // INISIATIF 1 (LOLOS)
    {
      proposalNumber: 'PROP-2026-0006',
      title: 'Kajian Daya Dukung Lingkungan dan Model Valuasi Ekonomi Jasa Ekosistem Hutan Mangrove Pesisir',
      proposedBudget: 88000000,
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_mangrove_0006.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_mangrove_0006.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ipb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ipb.pdf'
    },
    // INISIATIF 2 (LOLOS)
    {
      proposalNumber: 'PROP-2026-0007',
      title: 'Rancang Bangun Pembangkit Listrik Pikohidro Portabel Berbasis Turbin Aliran Silang untuk Penerangan Kampung Terisolir',
      proposedBudget: 95000000,
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_pikohidro_0007.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_pikohidro_0007.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_itb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_itb.pdf'
    },
    // INISIATIF 3 (GAGAL - RAB DUMMY KOSONG TANPA ANGKA)
    {
      proposalNumber: 'PROP-2026-0008',
      title: 'Strategi Pengelolaan Sampah Perkotaan Terpadu Melalui Sirkular Ekonomi Berbasis Bank Sampah Unit Sekolah dan Pasar',
      proposedBudget: 75000000,
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_sampah_0008.pdf',
      rabFileUrl: '/uploads/proposals/rab_kosong_tanpa_angka_0008.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ugm.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ugm.pdf'
    },
    // INISIATIF 4 (GAGAL - BELANJA MODAL TERLARANG)
    {
      proposalNumber: 'PROP-2026-0009',
      title: 'Model Hilirisasi Komoditas Kopi Arabika Dataran Tinggi Melalui Penguatan Rantai Pasok dan Kemitraan Koperasi Produsen',
      proposedBudget: 82000000,
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_kopi_0009.pdf',
      rabFileUrl: '/uploads/proposals/rab_belanja_modal_terlarang_0009.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_unipa.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_unipa.pdf'
    },
    // INISIATIF 5 (GAGAL - NASKAH PROPOSAL DUMMY)
    {
      proposalNumber: 'PROP-2026-0010',
      title: 'Penguatan Peran Lembaga Musyawarah Adat dalam Mediasi Sengketa Ulayat Tanah untuk Kepastian Investasi Daerah',
      proposedBudget: 79000000,
      proposalFileUrl: '/uploads/proposals/naskah_proposal_dummy_bodong_0010.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_adat_0010.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_uncen.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_uncen.pdf'
    }
  ];

  console.log('=== RUNNING AUDIT ON ALL 10 PROPOSALS ===\n');

  for (const tc of testCases) {
    const res = await auditProposalFiles(tc);
    console.log(`[${tc.proposalNumber}] "${tc.title.substring(0, 45)}..."`);
    console.log(`  DummyFiles: ${res.hasDummyFiles} | BudgetDiscrepancy: ${res.hasBudgetDiscrepancy} | ProhibitedExpenses: ${res.hasProhibitedExpenses}`);
    console.log(`  Proposal Doc Status: ${res.proposalDoc?.status} (Words: ${res.proposalDoc?.wordCount}, Correlated: ${res.proposalDoc?.titleCorrelation})`);
    console.log(`  RAB Doc Status: ${res.rabDoc?.status} (Extracted: ${res.rabDoc?.extractedTotalFormatted}, Form: ${res.rabDoc?.formProposedBudgetFormatted})`);
    if (res.rabDoc?.prohibitedItems?.length > 0) {
      console.log(`  Prohibited Items: ${res.rabDoc?.prohibitedItems.join(', ')}`);
    }
    console.log(`  Cover Letter Status: ${res.coverLetterDoc?.status} | Integrity Pact Status: ${res.integrityPactDoc?.status}`);
    if (res.auditFlags.length > 0) {
      console.log(`  Audit Flags (${res.auditFlags.length}):`);
      res.auditFlags.forEach(f => console.log(`    - ${f}`));
    } else {
      console.log('  Audit Flags: [CLEAN - NO FLAGS]');
    }
    console.log('---------------------------------------------------------');
  }
}

main().catch(console.error);

