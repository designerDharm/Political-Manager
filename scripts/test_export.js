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

async function testExport() {
  const tables = [
    'Organization', 'User', 'Election', 'Campaign', 'Constituency', 'Ward', 'Booth',
    'Party', 'Candidate', 'CandidateElection', 'CampaignCandidate', 'CampaignMembership',
    'Household', 'Voter', 'VoterFieldProvenance', 'TurnoutSnapshot', 'VisEvent',
    'Interaction', 'Issue', 'IssueNote', 'Assignment', 'UserDevice', 'Session',
    'ElectoralRollImport', 'ImportPage', 'ImportRecord', 'DuplicateCandidatePair',
    'PrivacyPurpose', 'RetentionPolicy', 'PrivacyRequest', 'SecurityIncident',
    'ApprovalRequest'
  ];

  const dump = {
    metadata: {
      version: '1.0',
      type: 'CAMPAIGNOPS_BACKUP',
      createdAt: new Date().toISOString(),
      tablesCount: tables.length
    },
    tables: {}
  };

  let totalRows = 0;
  for (const table of tables) {
    const delegateName = table.charAt(0).toLowerCase() + table.slice(1);
    const modelDelegate = prisma[delegateName];
    if (modelDelegate && typeof modelDelegate.findMany === 'function') {
      const rows = await modelDelegate.findMany();
      dump.tables[table] = rows;
      totalRows += rows.length;
    }
  }

  console.log('Exported total rows across all tables:', totalRows);
  const jsonStr = JSON.stringify(dump);
  const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');
  console.log('JSON size bytes:', sizeBytes);
}

testExport().then(() => process.exit(0)).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
