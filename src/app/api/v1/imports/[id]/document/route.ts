import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// GET /api/v1/imports/[id]/document - Stream original PDF source with campaign RBAC
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const importId = params.id;

    const importJob = await prisma.electoralRollImport.findUnique({
      where: { id: importId },
      select: {
        id: true,
        campaignId: true,
        originalFilename: true,
        filePath: true,
      },
    });

    if (!importJob) {
      return apiError('NOT_FOUND', 'Import job record not found', 404);
    }

    // Role and campaign isolation
    const access = await requireCampaignAccess(principal, importJob.campaignId);
    if ('error' in access) return access.error;

    if (!importJob.filePath || !fs.existsSync(importJob.filePath)) {
      return apiError('NOT_FOUND', 'Source electoral roll PDF not found on disk', 404);
    }

    // Path traversal defense: confirm file is strictly within uploads/imports or project root
    const normalizedPath = path.resolve(importJob.filePath);
    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'imports');
    const projectDir = path.resolve(process.cwd());

    if (!normalizedPath.startsWith(uploadsDir) && !normalizedPath.startsWith(projectDir)) {
      return apiError('FORBIDDEN', 'Access to source path outside managed storage is forbidden', 403);
    }

    const stat = fs.statSync(normalizedPath);
    const fileStream = fs.createReadStream(normalizedPath);

    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    const safeFilename = path.basename(importJob.originalFilename || 'electoral_roll.pdf');

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Content-Length': String(stat.size),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Source PDF download error:', err);
    return apiError('INTERNAL_ERROR', 'Failed to read source document', 500, err.message);
  }
}
