import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/response';
import { requirePlatformRole } from '@/lib/auth';
import { backupStorage, BackupMetadata } from '@/lib/backup/postgresBackup';
import path from 'path';

// GET /api/v1/admin/backups/[id]/download - Stream dump file securely to Super Admin
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const backupId = params.id;
    if (!backupId || backupId.includes('..') || backupId.includes('/') || backupId.includes('\\')) {
      return apiError('VALIDATION_ERROR', 'Invalid backup identifier', 400);
    }

    // Locate audit event
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
      return apiError('NOT_FOUND', 'Physical backup file not found in storage', 404);
    }

    const fileStream = backupStorage.getStream(filename);
    const fileSize = backupStorage.getSize(filename);

    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileSize),
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('Backup download error:', err);
    return apiError('INTERNAL_ERROR', 'Failed to download backup', 500, err.message);
  }
}
