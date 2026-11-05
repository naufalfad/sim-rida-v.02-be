const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== UPDATING PROPOSALS TEST DATA IN DATABASE ===');

  const STAF_BRIDA_ID = '66131cec-582f-43e0-8b20-a56aa157cfca'; // Ahmad Fauzi
  const REVIEWER_ID = '586c114f-1989-476e-9f07-faf5158824d0';   // Dr. Siti Rahmawati
  const AGENDA_ID = 'effb6f2e-f12b-4a1a-9c92-70e6515f191b';     // Agenda Stunting 2026 (Pagu 150M)
  const UNCEN_RESEARCHER_ID = '3f6e6e98-f050-4280-ba4e-9cb2b3400b52'; // Dr. Maria Rahantoknam

  const now = new Date();
  const slaDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // 1. UPDATE PROP-2026-0001 (AGENDA - ADMIN_PASSED - UGM)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0001' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0001.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0001.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ugm.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ugm.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas Kesehatan, Dinas Ketahanan Pangan, Bappeda',
      adminDuplicateNotes: 'Dokumen lengkap dan absah. Sesuai KAK Agenda Riset Penurunan Stunting 2026.',
      scoreScientificQuality: 88.5,
      scoreOpdRelevance: 91.0,
      scorePolicyApplicability: 87.0,
      scoreBudgetFeasibility: 85.0,
      opdRelevanceScore: 88.4,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    }
  });
  console.log('[OK] PROP-2026-0001 updated (ADMIN_PASSED - Score 88.4)');

  // 2. UPDATE PROP-2026-0002 (AGENDA - ADMIN_PASSED - ITB)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0002' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0002.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0002.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_itb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_itb.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas PUPR, Dinas Kesehatan, Bappeda',
      adminDuplicateNotes: 'Seluruh persyaratan administratif terpenuhi. Berkas otentik dan tersertifikasi.',
      scoreScientificQuality: 86.0,
      scoreOpdRelevance: 89.0,
      scorePolicyApplicability: 84.5,
      scoreBudgetFeasibility: 88.0,
      opdRelevanceScore: 87.0,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    }
  });
  console.log('[OK] PROP-2026-0002 updated (ADMIN_PASSED - Score 87.0)');

  // 3. UPDATE PROP-2026-0003 (AGENDA - ADMIN_PASSED - IPB)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0003' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0003.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0003.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ipb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ipb.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas Perikanan, Dinas Kesehatan, Bappeda',
      adminDuplicateNotes: 'Dokumen diverifikasi valid. Pendekatan pangan laut bernilai gizi tinggi teruji.',
      scoreScientificQuality: 84.0,
      scoreOpdRelevance: 86.0,
      scorePolicyApplicability: 82.0,
      scoreBudgetFeasibility: 84.0,
      opdRelevanceScore: 84.2,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    }
  });
  console.log('[OK] PROP-2026-0003 updated (ADMIN_PASSED - Score 84.2)');

  // 4. UPDATE PROP-2026-0005 (AGENDA - ADMIN_PASSED - UNIPA)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0005' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0005.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0005.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_unipa.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_unipa.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas Pemberdayaan Masyarakat, Dinas Kesehatan, Bappeda',
      adminDuplicateNotes: 'Berkas sah, riset kultural sagu menjawab tantangan intervensi pangan lokal.',
      scoreScientificQuality: 82.0,
      scoreOpdRelevance: 84.0,
      scorePolicyApplicability: 80.0,
      scoreBudgetFeasibility: 82.0,
      opdRelevanceScore: 82.2,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    }
  });
  console.log('[OK] PROP-2026-0005 updated (ADMIN_PASSED - Score 82.2)');

  // 5. UPSERT PROP-2026-0011 (AGENDA - ADMIN_PASSED - UNCEN - 5th ACTIVE PROPOSAL)
  const prop11 = await prisma.researchProposal.upsert({
    where: { proposalNumber: 'PROP-2026-0011' },
    update: {
      title: 'Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      researcherId: UNCEN_RESEARCHER_ID,
      focusArea: 'Kesehatan Masyarakat & Penanggulangan Stunting',
      targetLocation: 'Kawasan Pedalaman Distrik Jita dan Distrik Agimuga',
      estimatedDurationMonths: 4,
      proposedBudget: 138000000,
      status: 'ADMIN_PASSED',
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0011.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0011.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_uncen.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_uncen.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas Kesehatan, Dinas Pemberdayaan Masyarakat Kampung, Bappeda',
      adminDuplicateNotes: 'Berkas naskah proposal, RAB, surat pengantar, dan pakta integritas terverifikasi sah 100%.',
      scoreScientificQuality: 85.0,
      scoreOpdRelevance: 87.5,
      scorePolicyApplicability: 83.0,
      scoreBudgetFeasibility: 86.0,
      opdRelevanceScore: 85.5,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    },
    create: {
      proposalNumber: 'PROP-2026-0011',
      title: 'Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman',
      agendaId: AGENDA_ID,
      submissionType: 'AGENDA_COMPETITIVE',
      researcherId: UNCEN_RESEARCHER_ID,
      focusArea: 'Kesehatan Masyarakat & Penanggulangan Stunting',
      targetLocation: 'Kawasan Pedalaman Distrik Jita dan Distrik Agimuga',
      background: 'Wilayah geografis pedalaman yang terisolir menghadapi tantangan ganda dalam penanganan stunting: kerentanan akses logistik pangan pokok bergizi dan kuatnya pengaruh tabu adat terkait larangan makanan berprotein bagi ibu hamil dan menyusui.',
      methodology: 'Metodologi riset menggunakan pendekatan mixed methods sekuensial eksplanatori dengan instrumen Household Food Insecurity Access Scale (HFIAS) dan antropometri baduta.',
      estimatedDurationMonths: 4,
      proposedBudget: 138000000,
      status: 'ADMIN_PASSED',
      slaDeadline: slaDeadline,
      proposalFileUrl: '/uploads/proposals/proposal_agenda_stunting_0011.pdf',
      rabFileUrl: '/uploads/proposals/rab_agenda_stunting_0011.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_uncen.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_uncen.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      adminRpjmdThematicTag: 'Peningkatan Derajat Kesehatan Masyarakat dan Penanggulangan Stunting',
      adminCrossCuttingOpdTags: 'Dinas Kesehatan, Dinas Pemberdayaan Masyarakat Kampung, Bappeda',
      adminDuplicateNotes: 'Berkas naskah proposal, RAB, surat pengantar, dan pakta integritas terverifikasi sah 100%.',
      scoreScientificQuality: 85.0,
      scoreOpdRelevance: 87.5,
      scorePolicyApplicability: 83.0,
      scoreBudgetFeasibility: 86.0,
      opdRelevanceScore: 85.5,
      reviewerRecommendation: 'RECOMMENDED',
      opdReviewerId: REVIEWER_ID,
      opdReviewedAt: now,
    }
  });
  console.log('[OK] PROP-2026-0011 upserted (ADMIN_PASSED - Score 85.5)');

  // 6. UPDATE PROP-2026-0006 (INITIATIVE - LOLOS GERBANG 1 - ADMIN_PASSED)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0006' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: null,
      submissionType: 'INITIATIVE',
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_mangrove_0006.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_mangrove_0006.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ipb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ipb.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      opdReviewerId: REVIEWER_ID,
      adminRpjmdThematicTag: 'Pengelolaan Lingkungan Hidup, Ketahanan Iklim, dan Keberlanjutan Pesisir',
      adminCrossCuttingOpdTags: 'Dinas Lingkungan Hidup, Dinas Perikanan, Bappeda',
      adminDuplicateNotes: 'Usulan inisiatif mandiri lolos verifikasi administrasi dan audit berkas fisik Gerbang 1. Diteruskan ke Tim Reviewer OPD.',
    }
  });
  console.log('[OK] PROP-2026-0006 updated (INITIATIVE - ADMIN_PASSED)');

  // 7. UPDATE PROP-2026-0007 (INITIATIVE - LOLOS GERBANG 1 - ADMIN_PASSED)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0007' },
    data: {
      status: 'ADMIN_PASSED',
      agendaId: null,
      submissionType: 'INITIATIVE',
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_pikohidro_0007.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_pikohidro_0007.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_itb.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_itb.pdf',
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: 'UNIQUE',
      adminDuplicateCheck: true,
      adminCheckedById: STAF_BRIDA_ID,
      adminCheckedAt: now,
      opdReviewerId: REVIEWER_ID,
      adminRpjmdThematicTag: 'Penyediaan Infrastruktur Wilayah dan Akses Energi Terbarukan Daerah Terisolir',
      adminCrossCuttingOpdTags: 'Dinas PUPR, Bappeda',
      adminDuplicateNotes: 'Usulan inisiatif mandiri lolos verifikasi administrasi Gerbang 1. Berkas rekayasa teknologi terverifikasi sah.',
    }
  });
  console.log('[OK] PROP-2026-0007 updated (INITIATIVE - ADMIN_PASSED)');

  // 8. UPDATE PROP-2026-0008 (INITIATIVE - GAGAL GERBANG 1 - RAB KOSONG / DUMMY)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0008' },
    data: {
      status: 'SUBMITTED',
      agendaId: null,
      submissionType: 'INITIATIVE',
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_sampah_0008.pdf',
      rabFileUrl: '/uploads/proposals/rab_kosong_tanpa_angka_0008.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_ugm.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_ugm.pdf',
      adminCheckSuratPengantar: false,
      adminCheckSusunanTim: false,
      adminCheckKesesuaianRab: false,
      adminCheckPaktaIntegritas: false,
      adminDuplicateStatus: null,
      adminDuplicateCheck: null,
      adminCheckedById: null,
      adminCheckedAt: null,
      opdReviewerId: null,
      aiGate1Analysis: null,
      aiGate1AnalyzedAt: null,
    }
  });
  console.log('[OK] PROP-2026-0008 updated (INITIATIVE - SUBMITTED - Defective RAB Kosong)');

  // 9. UPDATE PROP-2026-0009 (INITIATIVE - GAGAL GERBANG 1 - BELANJA MODAL TERLARANG)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0009' },
    data: {
      status: 'SUBMITTED',
      agendaId: null,
      submissionType: 'INITIATIVE',
      proposalFileUrl: '/uploads/proposals/proposal_inisiatif_kopi_0009.pdf',
      rabFileUrl: '/uploads/proposals/rab_belanja_modal_terlarang_0009.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_unipa.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_unipa.pdf',
      adminCheckSuratPengantar: false,
      adminCheckSusunanTim: false,
      adminCheckKesesuaianRab: false,
      adminCheckPaktaIntegritas: false,
      adminDuplicateStatus: null,
      adminDuplicateCheck: null,
      adminCheckedById: null,
      adminCheckedAt: null,
      opdReviewerId: null,
      aiGate1Analysis: null,
      aiGate1AnalyzedAt: null,
    }
  });
  console.log('[OK] PROP-2026-0009 updated (INITIATIVE - SUBMITTED - Defective Belanja Modal Terlarang)');

  // 10. UPDATE PROP-2026-0010 (INITIATIVE - GAGAL GERBANG 1 - NASKAH DUMMY BODONG)
  await prisma.researchProposal.update({
    where: { proposalNumber: 'PROP-2026-0010' },
    data: {
      status: 'SUBMITTED',
      agendaId: null,
      submissionType: 'INITIATIVE',
      proposalFileUrl: '/uploads/proposals/naskah_proposal_dummy_bodong_0010.pdf',
      rabFileUrl: '/uploads/proposals/rab_inisiatif_adat_0010.pdf',
      coverLetterUrl: '/uploads/proposals/surat_pengantar_resmi_uncen.pdf',
      integrityPactUrl: '/uploads/proposals/pakta_integritas_resmi_uncen.pdf',
      adminCheckSuratPengantar: false,
      adminCheckSusunanTim: false,
      adminCheckKesesuaianRab: false,
      adminCheckPaktaIntegritas: false,
      adminDuplicateStatus: null,
      adminDuplicateCheck: null,
      adminCheckedById: null,
      adminCheckedAt: null,
      opdReviewerId: null,
      aiGate1Analysis: null,
      aiGate1AnalyzedAt: null,
    }
  });
  console.log('[OK] PROP-2026-0010 updated (INITIATIVE - SUBMITTED - Defective Naskah Bodong)');

  console.log('\n=== ALL DATABASE TEST PROPOSALS HAVE BEEN SYNCHRONIZED! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());

