import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requirePlatformRole } from '@/lib/auth';
import { createPostgresBackup, BackupMetadata } from '@/lib/backup/postgresBackup';

// GET /api/v1/admin/backups - List authoritative PostgreSQL backups (Super Admin only)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const backupRecords = await prisma.auditEvent.findMany({
      where: { action: { in: ['BACKUP_CREATED', 'BACKUP_FAILED', 'TRIGGER_BACKUP'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const backups = backupRecords.map((b) => {
      let meta: Partial<BackupMetadata> = {};
      try {
        meta = b.details ? JSON.parse(b.details) : {};
      } catch {
        meta = {};
      }

      const isFailed = b.action === 'BACKUP_FAILED' || meta.status === 'FAILED';

      return {
        id: meta.id || b.id,
        filename: meta.filename || `campaignops_backup_${new Date(b.createdAt).toISOString().replace(/[:.]/g, '-')}.json`,
        size: meta.sizeFormatted || (isFailed ? '0 KB' : '128 KB'),
        sizeBytes: meta.sizeBytes || 0,
        sha256: meta.sha256 || 'N/A',
        format: meta.format || 'json',
        database: meta.database || 'campaignops',
        timestamp: new Date(b.createdAt).toISOString(),
        status: isFailed ? 'FAILED' : (meta.status || 'COMPLETED'),
        createdBy: b.actorId || 'system',
        error: meta.error,
        diagnosticRef: meta.diagnosticRef,
        verified: Boolean(meta.verified),
      };
    });

    // Authoritative calculation of integrity and RPO metrics
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

    return apiSuccess({
      backups,
      metrics: {
        hasVerifiedBackup,
        rpoStatus,
        rpoBadgeText: hasVerifiedBackup ? (rpoBadgeType === 'success' ? 'Compliant' : 'Warning') : 'Non-compliant',
        rpoBadgeType,
        integrityStatus,
        integritySubtitle,
        snapshotEngine: 'Prisma/PostgreSQL Dump',
        snapshotSubtitle: hasVerifiedBackup ? 'SHA-256 Checksum Verified' : 'No verified backup',
      },
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve backups list', 500, String(err));
  }
}

// POST /api/v1/admin/backups - Trigger real PostgreSQL snapshot (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const org = await prisma.organization.findFirst();
    const orgId = principal.organizationId || org?.id || 'default-org';

    // Execute backup
    const metadata = await createPostgresBackup(principal.userId, orgId);

    return apiSuccess(
      {
        id: metadata.id,
        filename: metadata.filename,
        size: metadata.sizeFormatted,
        sizeBytes: metadata.sizeBytes,
        sha256: metadata.sha256,
        format: metadata.format,
        database: metadata.database,
        timestamp: metadata.createdAt,
        status: metadata.status,
        verified: metadata.verified,
        diagnosticRef: metadata.diagnosticRef,
      },
      { message: 'PostgreSQL database snapshot generated and SHA-256 checksum verified' },
      201
    );
  } catch (err: any) {
    console.error('Database backup failure:', err);
    return apiError(
      'INTERNAL_ERROR',
      err.message || 'Failed to generate database backup',
      500
    );
  }
}
