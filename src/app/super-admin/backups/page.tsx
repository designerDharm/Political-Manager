import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminBackupsClient, { BackupItem, BackupMetrics } from '@/components/super-admin/SuperAdminBackupsClient';

export const revalidate = 0;

export default async function SuperAdminBackupsPage() {
  const backupRecords = await prisma.auditEvent.findMany({
    where: { action: { in: ['BACKUP_CREATED', 'BACKUP_FAILED', 'TRIGGER_BACKUP'] } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const backups: BackupItem[] = backupRecords.map((b) => {
    let payload: any = {};
    try {
      payload = b.details ? JSON.parse(b.details) : {};
    } catch {
      payload = {};
    }

    const isFailed = b.action === 'BACKUP_FAILED' || payload.status === 'FAILED';

    return {
      id: payload.id || b.id,
      filename: payload.filename || `campaignops_backup_${new Date(b.createdAt).toISOString().replace(/[:.]/g, '-')}.json`,
      size: payload.sizeFormatted || payload.size || (isFailed ? '0 KB' : '128 KB'),
      sha256: payload.sha256 || 'N/A',
      type: 'POSTGRESQL_STRUCTURED_DUMP',
      timestamp: new Date(b.createdAt).toLocaleString(),
      status: isFailed ? 'FAILED' : (payload.status || 'COMPLETED'),
      error: payload.error,
      diagnosticRef: payload.diagnosticRef,
      verified: Boolean(payload.verified),
    };
  });

  // Authoritative metrics derived strictly from backend records
  const completedBackups = backups.filter((b) => b.status === 'COMPLETED' && b.verified);
  const hasVerifiedBackup = completedBackups.length > 0;

  let rpoStatus = 'No verified backup';
  let rpoBadgeType: 'success' | 'warning' | 'danger' = 'danger';
  let integrityStatus = 'Not verified';
  let integritySubtitle = 'No verified backup snapshot available';

  if (hasVerifiedBackup) {
    const latestBackup = completedBackups[0];
    const now = new Date().getTime();
    const backupTime = new Date(latestBackup.timestamp).getTime();
    const diffMinutes = Math.floor((now - backupTime) / (1000 * 60));

    if (diffMinutes < 60) {
      rpoStatus = `< ${Math.max(1, diffMinutes)} Mins`;
      rpoBadgeType = 'success';
    } else if (diffMinutes < 1440) {
      rpoStatus = `${Math.floor(diffMinutes / 60)}h ago`;
      rpoBadgeType = 'warning';
    } else {
      rpoStatus = `${Math.floor(diffMinutes / 1440)}d ago`;
      rpoBadgeType = 'danger';
    }

    const passRate = Math.round((completedBackups.length / backups.length) * 100);
    integrityStatus = `${passRate}% Passed`;
    integritySubtitle = `${completedBackups.length}/${backups.length} snapshots SHA-256 verified`;
  }

  const initialMetrics: BackupMetrics = {
    hasVerifiedBackup,
    rpoStatus,
    rpoBadgeText: hasVerifiedBackup ? (rpoBadgeType === 'success' ? 'Compliant' : 'Warning') : 'Non-compliant',
    rpoBadgeType,
    integrityStatus,
    integritySubtitle,
    snapshotEngine: 'PostgreSQL Structured Dump',
    snapshotSubtitle: hasVerifiedBackup ? 'SHA-256 Checksum Verified' : 'No verified backup',
  };

  return <SuperAdminBackupsClient initialBackups={backups} initialMetrics={initialMetrics} />;
}
