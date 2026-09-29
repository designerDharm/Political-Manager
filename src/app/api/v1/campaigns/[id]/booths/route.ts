import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// GET /api/v1/campaigns/[id]/booths - Retrieve booths with parent ward details
export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const where: any = { campaignId };

    // Scoping for Political Agent
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, campaignId);
      if (allowedBooths !== null) {
        where.id = { in: allowedBooths };
      }
    }

    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('wardId');
    if (wardId) {
      where.wardId = wardId;
    }

    const booths = await prisma.booth.findMany({
      where,
      orderBy: { boothNumber: 'asc' },
      include: {
        ward: {
          select: {
            id: true,
            wardNumber: true,
            name: true,
            localityType: true,
          },
        },
        _count: {
          select: {
            voters: true,
            households: true,
            issues: true,
          },
        },
      },
    });

    return apiSuccess(booths);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaign booths', 500, String(err));
  }
}

// POST /api/v1/campaigns/[id]/booths - Create a single or batch scaffold booths under a ward
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot create or configure booths', 403);
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

    // Support batch scaffolding under a specific ward: { wardId, count: 3, prefix: 'Booth' }
    if (body.count !== undefined && body.wardId) {
      const count = Number(body.count);
      if (isNaN(count) || count <= 0 || count > 500) {
        return apiError('VALIDATION_ERROR', 'Booth count must be between 1 and 500', 400);
      }

      // Verify ward belongs to this campaign
      const ward = await prisma.ward.findFirst({
        where: { id: body.wardId, campaignId },
      });
      if (!ward) {
        return apiError('NOT_FOUND', 'Specified ward does not exist in this campaign', 404);
      }

      // Find highest existing boothNumber in campaign
      const existingBooths = await prisma.booth.findMany({
        where: { campaignId },
        select: { boothNumber: true },
        orderBy: { boothNumber: 'desc' },
      });
      const startNum = existingBooths.length > 0 ? Math.max(...existingBooths.map(b => b.boothNumber)) + 1 : 1;

      const createdBooths = await prisma.$transaction(async (tx) => {
        const boothsToInsert = [];
        for (let i = 0; i < count; i++) {
          const num = startNum + i;
          const b = await tx.booth.create({
            data: {
              campaignId,
              wardId: body.wardId,
              boothNumber: num,
              name: `Booth ${num} - ${ward.name}`,
              areaLocality: body.areaLocality || `${ward.name} Locality`,
              pollingStation: body.pollingStation || `Polling Station ${num}`,
              totalElectors: Number(body.totalElectors) || 0,
              status: 'Active',
              coverageStatus: 'Not Visited',
            },
          });
          boothsToInsert.push(b);
        }
        await tx.campaign.update({
          where: { id: campaignId },
          data: { declaredBooths: existingBooths.length + count },
        });
        return boothsToInsert;
      });

      return apiSuccess(createdBooths, { createdCount: createdBooths.length }, 201);
    }

    // Single booth creation: { wardId, boothNumber, name, areaLocality, pollingStation, totalElectors }
    const { wardId, boothNumber, name, areaLocality, pollingStation, totalElectors } = body;

    if (!wardId) {
      return apiError('VALIDATION_ERROR', 'Parent wardId is required for booth creation', 400);
    }
    if (boothNumber === undefined || isNaN(Number(boothNumber)) || Number(boothNumber) <= 0) {
      return apiError('VALIDATION_ERROR', 'Valid positive booth number is required', 400);
    }
    if (!name || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Booth name is required', 400);
    }

    // Verify parent ward exists in campaign
    const ward = await prisma.ward.findFirst({
      where: { id: wardId, campaignId },
    });
    if (!ward) {
      return apiError('NOT_FOUND', 'Specified parent ward does not exist in this campaign', 404);
    }

    // Check boothNumber uniqueness within campaign
    const existing = await prisma.booth.findFirst({
      where: { campaignId, boothNumber: Number(boothNumber) },
    });
    if (existing) {
      return apiError('CONFLICT', `Booth number ${boothNumber} already exists in this campaign`, 409);
    }

    const booth = await prisma.booth.create({
      data: {
        campaignId,
        wardId,
        boothNumber: Number(boothNumber),
        name: name.trim(),
        areaLocality: areaLocality ? areaLocality.trim() : 'Locality',
        pollingStation: pollingStation ? pollingStation.trim() : 'Polling Station',
        totalElectors: Number(totalElectors) || 0,
        status: 'Active',
        coverageStatus: 'Not Visited',
      },
    });

    return apiSuccess(booth, { created: true }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to create booth', 500, String(err));
  }
}
