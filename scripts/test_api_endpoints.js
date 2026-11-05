require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'simrida_v2_super_secret_jwt_key_2026';

// Generate reviewer token
const reviewerToken = jwt.sign(
  {
    id: '586c114f-1989-476e-9f07-faf5158824d0',
    email: 'reviewer@pemda.go.id',
    role: 'REVIEWER_BRIDA',
    name: 'Dr. Siti Rahmawati, M.Si.'
  },
  JWT_SECRET,
  { expiresIn: '1d' }
);

// Generate staf brida token
const stafToken = jwt.sign(
  {
    id: '66131cec-582f-43e0-8b20-a56aa157cfca',
    email: 'staf.brida@pemda.go.id',
    role: 'STAF_BRIDA',
    name: 'Ahmad Fauzi, S.IP.'
  },
  JWT_SECRET,
  { expiresIn: '1d' }
);

async function testEndpoints() {
  console.log('Testing Agenda Proposals...');
  const resAgenda = await fetch('http://localhost:5001/api/proposals?submissionType=AGENDA_COMPETITIVE', {
    headers: { Authorization: `Bearer ${reviewerToken}` }
  });
  const dataAgenda = await resAgenda.json();
  console.log('Agenda Count:', dataAgenda.data?.length, 'Status:', resAgenda.status);
  if (dataAgenda.data) {
    dataAgenda.data.forEach(p => {
      console.log(`  [${p.proposalNumber}] ${p.status} - ${p.title.substring(0, 45)}... (Score: ${p.opdRelevanceScore})`);
    });
  }

  console.log('\nTesting Initiative Proposals...');
  const resInit = await fetch('http://localhost:5001/api/proposals?submissionType=INITIATIVE', {
    headers: { Authorization: `Bearer ${stafToken}` }
  });
  const dataInit = await resInit.json();
  console.log('Initiative Count:', dataInit.data?.length, 'Status:', resInit.status);
  if (dataInit.data) {
    dataInit.data.forEach(p => {
      console.log(`  [${p.proposalNumber}] ${p.status} - ${p.title.substring(0, 45)}... (AdminCheck: ${p.adminCheckKesesuaianRab})`);
    });
  }
}

testEndpoints().catch(console.error);
