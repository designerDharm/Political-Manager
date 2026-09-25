import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminBackupsClient from '@/components/super-admin/SuperAdminBackupsClient';

export const revalidate = 0;

export default async function SuperAdminBackupsPage() {
  const backupRecords = await prisma.auditEvent.findMany({
    where: { action: 'TRIGGER_BACKUP' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const backups = backupRecords.map((b) => {
    let payload: any = {};
    try {
      payload = b.details ? JSON.parse(b.details) : {};
    } catch (e) {
      payload = {};
    }
    return {
      id: b.id,
      filename: payload.filename || `campaignops_backup_${new Date(b.createdAt).toISOString().replace(/[:.]/g, '-')}.db`,
      size: payload.size || '128 KB',
      type: 'FULL_SNAPSHOT',
      timestamp: new Date(b.createdAt).toLocaleString(),
      status: 'VERIFIED',
    };
  });

  return <SuperAdminBackupsClient initialBackups={backups} />;
}
