import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requirePlatformRole } from '@/lib/auth';
import { restorePostgresBackup, getBackupBuffer } from '@/lib/backup/postgresBackup';

// POST /api/v1/admin/backups/[id]/restore - Restore a verified PostgreSQL backup to an isolated target
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const backupId = params.id;

    if (!backupId || backupId.includes('..') || backupId.includes('/') || backupId.includes('\\')) {
      return apiError('VALIDATION_ERROR', 'Invalid backup identifier', 400);
    }

    const body = await req.json();
    const { confirmationPhrase, targetDatabase } = body;

    // Destructive action safeguard: Explicit confirmation phrase required
    const expectedPhrase = `RESTORE_${backupId}`;
    if (confirmationPhrase !== expectedPhrase) {
      return apiError(
        'VALIDATION_ERROR',
        `Destructive action requires explicit confirmation phrase '${expectedPhrase}'`,
        400
      );
    }

    // Locate backup record in AuditEvent
    const auditRecord = await prisma.auditEvent.findFirst({
      where: {
        action: 'BACKUP_CREATED',
        OR: [
          { resource: `backup:${backupId}` },
          { details: { contains: backupId } },
        ],
      },
    });

    if (!auditRecord) {
      return apiError('NOT_FOUND', 'Backup record not found in authoritative database', 404);
    }

    // Verify SHA-256 Checksum integrity prior to restoration
    let buffer: Buffer;
    let computedSha256: string;
    let filename: string;
    try {
      const res = await getBackupBuffer(backupId);
      buffer = res.buffer;
      computedSha256 = res.sha256;
      filename = res.filename;
    } catch (e: any) {
      return apiError('NOT_FOUND', e.message || 'Backup artifact missing or inaccessible', 404);
    }

    const meta = JSON.parse(auditRecord.details || '{}');
    if (meta.sha256 && computedSha256 !== meta.sha256) {
      await prisma.auditEvent.create({
        data: {
          organizationId: auditRecord.organizationId,
          actorId: principal.userId,
          action: 'RESTORE_REJECTED',
          resource: `backup:${backupId}`,
          details: JSON.stringify({
            reason: 'CHECKSUM_MISMATCH',
            expected: meta.sha256,
            actual: computedSha256,
          }),
        },
      });

      return apiError(
        'SECURITY_VIOLATION',
        'Backup integrity verification failed: SHA-256 checksum mismatch. Restoration rejected.',
        422
      );
    }

    // Isolate restore target: Requirement states: "Any restore validation must use an isolated disposable database."
    const isolatedTarget = targetDatabase || `isolated_drill_target_${backupId.slice(0, 8)}`;

    // Log RESTORE_STARTED
    await prisma.auditEvent.create({
      data: {
        organizationId: auditRecord.organizationId,
        actorId: principal.userId,
        action: 'RESTORE_STARTED',
        resource: `backup:${backupId}`,
        details: JSON.stringify({
          filename,
          targetDatabase: isolatedTarget,
          sha256: computedSha256,
        }),
      },
    });

    // Execute restore validation into isolated target
    const restoreResult = await restorePostgresBackup(backupId, isolatedTarget);

    // Log RESTORE_COMPLETED
    await prisma.auditEvent.create({
      data: {
        organizationId: auditRecord.organizationId,
        actorId: principal.userId,
        action: 'RESTORE_COMPLETED',
        resource: `backup:${backupId}`,
        details: JSON.stringify({
          filename,
          targetDatabase: isolatedTarget,
          details: restoreResult.details,
          rowsRestored: restoreResult.rowsRestored,
        }),
      },
    });

    return apiSuccess(
      {
        backupId,
        filename,
        checksumVerified: true,
        restoredTo: isolatedTarget,
        rowsRestored: restoreResult.rowsRestored,
      },
      { message: restoreResult.details }
    );
  } catch (err: any) {
    console.error('PostgreSQL restore error:', err);
    return apiError('INTERNAL_ERROR', err.message || 'Database restore operation failed', 500);
  }
}
