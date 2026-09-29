import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// GET /api/v1/campaigns/[id]/wards - Retrieve wards for downstream voter import & setup
export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const wards = await prisma.ward.findMany({
      where: { campaignId },
      orderBy: { wardNumber: 'asc' },
      include: {
        booths: {
          orderBy: { boothNumber: 'asc' },
          select: {
            id: true,
            boothNumber: true,
            name: true,
            areaLocality: true,
            pollingStation: true,
            totalElectors: true,
            status: true,
          },
        },
        _count: {
          select: {
            booths: true,
            voters: true,
          },
        },
      },
    });

    return apiSuccess(wards);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaign wards', 500, String(err));
  }
}

// POST /api/v1/campaigns/[id]/wards - Create a single or batch scaffold wards
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot create or configure wards', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    const body = await req.json();

    // Support batch scaffolding: { count: 5, prefix: 'Ward' }
    if (body.count !== undefined) {
      const count = Number(body.count);
      if (isNaN(count) || count <= 0 || count > 500) {
        return apiError('VALIDATION_ERROR', 'Ward count must be between 1 and 500', 400);
      }

      const localityType = body.localityType || 'WARD';
      const prefix = body.prefix || (localityType === 'VILLAGE' ? 'Village' : 'Ward');

      // Check existing max wardNumber for this campaign
      const existingWards = await prisma.ward.findMany({
        where: { campaignId },
        select: { wardNumber: true },
        orderBy: { wardNumber: 'desc' },
      });
      const startNum = existingWards.length > 0 ? Math.max(...existingWards.map(w => w.wardNumber)) + 1 : 1;

      const createdWards = await prisma.$transaction(async (tx) => {
        const wardsToInsert = [];
        for (let i = 0; i < count; i++) {
          const num = startNum + i;
          const w = await tx.ward.create({
            data: {
              campaignId,
              wardNumber: num,
              name: `${prefix} ${num}`,
              localityType,
            },
          });
          wardsToInsert.push(w);
        }
        await tx.campaign.update({
          where: { id: campaignId },
          data: { declaredWards: existingWards.length + count },
        });
        return wardsToInsert;
      });

      return apiSuccess(createdWards, { createdCount: createdWards.length }, 201);
    }

    // Single ward creation: { wardNumber, name, localityType }
    const { wardNumber, name, localityType } = body;
    if (wardNumber === undefined || isNaN(Number(wardNumber)) || Number(wardNumber) < 0) {
      return apiError('VALIDATION_ERROR', 'Valid ward number is required', 400);
    }
    if (!name || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Ward name is required', 400);
    }

    // Check uniqueness within campaign
    const existing = await prisma.ward.findFirst({
      where: { campaignId, wardNumber: Number(wardNumber) },
    });
    if (existing) {
      return apiError('CONFLICT', `Ward number ${wardNumber} already exists in this campaign`, 409);
    }

    const ward = await prisma.ward.create({
      data: {
        campaignId,
        wardNumber: Number(wardNumber),
        name: name.trim(),
        localityType: localityType || 'WARD',
      },
    });

    return apiSuccess(ward, { created: true }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to create ward', 500, String(err));
  }
}
