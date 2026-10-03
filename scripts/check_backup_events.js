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
async function main() {
  const res = await prisma.auditEvent.findMany({
    where: { action: { in: ['BACKUP_CREATED', 'BACKUP_FAILED', 'TRIGGER_BACKUP', 'RESTORE_STARTED', 'RESTORE_COMPLETED', 'RESTORE_REJECTED'] } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('Count of backup audit events in QA DB:', res.length);
  console.log(JSON.stringify(res, null, 2));
}
main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
