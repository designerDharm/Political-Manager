import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminBackupsClient from '@/components/super-admin/SuperAdminBackupsClient';

export const revalidate = 0;

export default async function SuperAdminBackupsPage() {
  const backupRecords = await prisma.auditEvent.findMany({
    where: { action: { in: ['BACKUP_CREATED', 'TRIGGER_BACKUP'] } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const backups = backupRecords.map((b) => {
    let payload: any = {};
    try {
      payload = b.details ? JSON.parse(b.details) : {};
    } catch {
      payload = {};
    }
    return {
      id: payload.id || b.id,
      filename: payload.filename || `campaignops_backup_${new Date(b.createdAt).toISOString().replace(/[:.]/g, '-')}.dump`,
      size: payload.sizeFormatted || payload.size || '128 KB',
      sha256: payload.sha256 || 'N/A',
      type: 'POSTGRESQL_CUSTOM_DUMP',
      timestamp: new Date(b.createdAt).toLocaleString(),
      status: payload.status || 'COMPLETED',
    };
  });

  return <SuperAdminBackupsClient initialBackups={backups} />;
}
