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

const { createPostgresBackup, restorePostgresBackup, getBackupBuffer } = require('./src/lib/backup/postgresBackup');
const { prisma } = require('./src/lib/prisma');

async function testBackupPipeline() {
  console.log('=== 1. Testing createPostgresBackup with QA Neon Database ===');
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  
  if (!org || !user) {
    throw new Error('Org or Super Admin user not found');
  }

  const metadata = await createPostgresBackup(user.id, org.id);
  console.log('✅ Backup created successfully:');
  console.log(JSON.stringify(metadata, null, 2));

  console.log('\n=== 2. Testing getBackupBuffer and Checksum Integrity ===');
  const { buffer, filename, sha256 } = await getBackupBuffer(metadata.id);
  console.log(`Buffer size: ${buffer.length} bytes | Filename: ${filename} | SHA-256: ${sha256}`);
  if (sha256 !== metadata.sha256) {
    throw new Error('Checksum mismatch between creation and retrieval');
  }
  console.log('✅ Checksum matches metadata perfectly');

  console.log('\n=== 3. Testing restorePostgresBackup to Isolated Disposable Target ===');
  const restoreRes = await restorePostgresBackup(metadata.id, 'isolated_disposable_qa_drill');
  console.log('✅ Restore execution result:');
  console.log(JSON.stringify(restoreRes, null, 2));

  console.log('\n=== 4. Checking Authoritative Audit Log Records ===');
  const auditEvents = await prisma.auditEvent.findMany({
    where: { resource: `backup:${metadata.id}` },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${auditEvents.length} audit event(s) for this backup:`);
  for (const ev of auditEvents) {
    console.log(` - Action: ${ev.action} | CreatedAt: ${ev.createdAt}`);
  }

  console.log('\n=== ALL LOCAL VERIFICATION CHECKS PASSED ===');
}

testBackupPipeline().then(() => process.exit(0)).catch(err => {
  console.error('Pipeline test failed:', err);
  process.exit(1);
});
