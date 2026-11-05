require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'simrida_v2_super_secret_jwt_key_2026';

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

async function testGate1Ai() {
  console.log('Testing Gate 1 AI on PROP-2026-0009 (Belanja Modal Terlarang)...');
  
  // Get proposal ID for PROP-2026-0009
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const prop9 = await prisma.researchProposal.findUnique({ where: { proposalNumber: 'PROP-2026-0009' } });
  
  if (!prop9) {
    console.log('PROP-2026-0009 not found');
    return;
  }

  const res = await fetch(`http://localhost:5001/api/proposals/${prop9.id}/ai-gate1-analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stafToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  console.log('Response Status:', res.status);
  console.log('Response Data:', JSON.stringify(data, null, 2));

  await prisma.$disconnect();
}

testGate1Ai().catch(console.error);
