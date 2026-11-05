const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const proposals = await prisma.researchProposal.findMany({
    orderBy: { proposalNumber: 'asc' },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      submissionType: true,
      agendaId: true,
      status: true,
      proposedBudget: true,
      proposalFileUrl: true,
      rabFileUrl: true,
      coverLetterUrl: true,
      integrityPactUrl: true,
      adminCheckedById: true,
      adminCheckSuratPengantar: true,
      adminCheckSusunanTim: true,
      adminCheckKesesuaianRab: true,
      adminCheckPaktaIntegritas: true,
      adminDuplicateStatus: true,
      opdRelevanceScore: true,
    }
  });

  const agendas = await prisma.researchAgenda.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      allocatedBudgetCeiling: true,
      isOpen: true,
    }
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    }
  });

  console.log('=== AGENDAS ===');
  console.log(JSON.stringify(agendas, null, 2));

  console.log('\n=== USERS ===');
  console.log(JSON.stringify(users, null, 2));

  console.log('\n=== PROPOSALS (' + proposals.length + ') ===');
  console.log(JSON.stringify(proposals, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

