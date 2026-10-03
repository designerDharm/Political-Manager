const fs = require('fs');
const envContent = fs.readFileSync('.env.qa.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[match[1].trim()] = val;
  }
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphans() {
  const orphanMemberships = await prisma.$queryRaw`
    SELECT m.id, m."userId", m."campaignId" 
    FROM "CampaignMembership" m
    LEFT JOIN "User" u ON m."userId" = u.id
    LEFT JOIN "Campaign" c ON m."campaignId" = c.id
    WHERE u.id IS NULL OR c.id IS NULL;
  `;

  const orphanBooths = await prisma.$queryRaw`
    SELECT b.id, b."wardId", b."campaignId" 
    FROM "Booth" b
    LEFT JOIN "Ward" w ON b."wardId" = w.id
    LEFT JOIN "Campaign" c ON b."campaignId" = c.id
    WHERE w.id IS NULL OR c.id IS NULL;
  `;

  const orphanVoters = await prisma.$queryRaw`
    SELECT v.id, v."campaignId", v."boothId" 
    FROM "Voter" v
    LEFT JOIN "Campaign" c ON v."campaignId" = c.id
    LEFT JOIN "Booth" b ON v."boothId" = b.id
    WHERE c.id IS NULL OR b.id IS NULL;
  `;

  const orphanInteractions = await prisma.$queryRaw`
    SELECT i.id, i."voterId", i."agentId" 
    FROM "Interaction" i
    LEFT JOIN "Voter" v ON i."voterId" = v.id
    LEFT JOIN "User" u ON i."agentId" = u.id
    WHERE v.id IS NULL OR u.id IS NULL;
  `;

  console.log('Orphan Memberships:', orphanMemberships.length);
  console.log('Orphan Booths:', orphanBooths.length);
  console.log('Orphan Voters:', orphanVoters.length);
  console.log('Orphan Interactions:', orphanInteractions.length);
}

checkOrphans().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
