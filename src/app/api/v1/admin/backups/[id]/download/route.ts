import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/response';
import { requirePlatformRole } from '@/lib/auth';
import { getBackupBuffer } from '@/lib/backup/postgresBackup';

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

    const { buffer, filename, sha256 } = await getBackupBuffer(backupId);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'X-Checksum-SHA256': sha256,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('Backup download error:', err);
    return apiError('NOT_FOUND', err.message || 'Failed to download backup', 404);
  }
}
