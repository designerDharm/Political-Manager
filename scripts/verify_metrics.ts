import fs from 'fs';
import { prisma } from '../src/lib/prisma';

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

async function verifyAuthoritativeMetrics() {
  const backupRecords = await prisma.auditEvent.findMany({
    where: { action: { in: ['BACKUP_CREATED', 'BACKUP_FAILED', 'TRIGGER_BACKUP'] } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  console.log(`Total backup audit records in QA DB: ${backupRecords.length}`);

  const backups = backupRecords.map((b) => {
    let payload: any = {};
    try {
      payload = b.details ? JSON.parse(b.details) : {};
    } catch {
      payload = {};
    }

    const isFailed = b.action === 'BACKUP_FAILED' || payload.status === 'FAILED';

    return {
      id: payload.id || b.id,
      filename: payload.filename,
      status: isFailed ? 'FAILED' : (payload.status || 'COMPLETED'),
      verified: Boolean(payload.verified),
      timestamp: b.createdAt,
      error: payload.error,
      diagnosticRef: payload.diagnosticRef,
    };
  });

  const completedBackups = backups.filter((b) => b.status === 'COMPLETED' && b.verified);
  const failedBackups = backups.filter((b) => b.status === 'FAILED');

  console.log(`Completed & verified backups: ${completedBackups.length}`);
  console.log(`Failed backup attempts: ${failedBackups.length}`);

  console.log('\n--- Failed Backup Details (Preserved with Diagnostics) ---');
  for (const fb of failedBackups) {
    console.log(` - ID: ${fb.id} | Diagnostic: ${fb.diagnosticRef || 'Legacy'} | Error: ${fb.error || 'N/A'}`);
  }

  console.log('\n--- Completed Backup Details ---');
  for (const cb of completedBackups) {
    console.log(` - ID: ${cb.id} | File: ${cb.filename} | Verified: ${cb.verified}`);
  }
}

verifyAuthoritativeMetrics().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
