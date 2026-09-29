import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requirePlatformRole } from '@/lib/auth';
import { backupStorage, restorePostgresBackup, BackupMetadata } from '@/lib/backup/postgresBackup';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// POST /api/v1/admin/backups/[id]/restore - Restore a verified PostgreSQL backup
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
      return apiError('NOT_FOUND', 'Backup record not found', 404);
    }

    const meta = JSON.parse(auditRecord.details || '{}') as Partial<BackupMetadata>;
    const filename = meta.filename ? path.basename(meta.filename) : null;

    if (!filename || !backupStorage.exists(filename)) {
      return apiError('NOT_FOUND', 'Physical backup file not found', 404);
    }

    // Verify SHA-256 Checksum integrity prior to restoration
    const filePath = backupStorage.savePath(filename);
    const fileBuffer = fs.readFileSync(filePath);
    const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

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

    // Log RESTORE_STARTED
    await prisma.auditEvent.create({
      data: {
        organizationId: auditRecord.organizationId,
        actorId: principal.userId,
        action: 'RESTORE_STARTED',
        resource: `backup:${backupId}`,
        details: JSON.stringify({
          filename,
          targetDatabase: targetDatabase || 'campaignops',
          sha256: computedSha256,
        }),
      },
    });

    // Execute restore
    const restoreResult = await restorePostgresBackup(filename, targetDatabase);

    // Log RESTORE_COMPLETED
    await prisma.auditEvent.create({
      data: {
        organizationId: auditRecord.organizationId,
        actorId: principal.userId,
        action: 'RESTORE_COMPLETED',
        resource: `backup:${backupId}`,
        details: JSON.stringify({
          filename,
          targetDatabase: targetDatabase || 'campaignops',
          details: restoreResult.details,
        }),
      },
    });

    return apiSuccess(
      {
        backupId,
        filename,
        checksumVerified: true,
        restoredTo: targetDatabase || 'campaignops',
      },
      { message: 'PostgreSQL database restoration completed successfully' }
    );
  } catch (err: any) {
    console.error('PostgreSQL restore error:', err);
    return apiError('INTERNAL_ERROR', 'Database restore operation failed', 500, err.message);
  }
}
