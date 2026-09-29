import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// GET /api/v1/imports/[id] - Get import job details and staged records
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const importId = params.id;
    const importJob = await prisma.electoralRollImport.findUnique({
      where: { id: importId },
      include: {
        campaign: { select: { id: true, name: true, organizationId: true } },
        pages: {
          orderBy: { pageNumber: 'asc' },
          select: { id: true, pageNumber: true, ocrStatus: true, confidence: true },
        },
      },
    });

    if (!importJob) {
      return apiError('NOT_FOUND', 'Import job not found', 404);
    }

    const access = await requireCampaignAccess(authResult.principal, importJob.campaignId);
    if ('error' in access) return access.error;

    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get('status'); // VALID, LOW_CONFIDENCE, DUPLICATE_SUSPECT, etc.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: any = { importId };
    if (filterStatus && filterStatus !== 'ALL') {
      where.status = filterStatus;
    }

    const [totalRecords, records] = await Promise.all([
      prisma.importRecord.count({ where }),
      prisma.importRecord.findMany({
        where,
        orderBy: { serialNumber: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const counts = await prisma.importRecord.groupBy({
      by: ['status'],
      where: { importId },
      _count: true,
    });

    const statusCounts: Record<string, number> = {
      TOTAL: 0,
      VALID: 0,
      LOW_CONFIDENCE: 0,
      DUPLICATE_SUSPECT: 0,
      INVALID: 0,
      PUBLISHED: 0,
    };

    for (const c of counts) {
      statusCounts[c.status] = c._count;
      statusCounts.TOTAL += c._count;
    }

    return apiSuccess({
      importJob,
      statusCounts,
      records,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve import details', 500, String(err));
  }
}
