import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, getAgentBoothScope } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    // Campaign isolation check
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to this campaign voter registry is denied', 403);
      }
    }

    const query = searchParams.get('q')?.trim();
    const wardNumber = searchParams.get('ward');
    const boothNumber = searchParams.get('booth');
    const gender = searchParams.get('gender');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const where: any = {};
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      where.campaignId = { in: allowedCampaignIds };
    }

    // Agent Booth Scoping: If user is POLITICAL_AGENT, scope query to assigned booth(s)
    if (principal.platformRole === 'POLITICAL_AGENT') {
      const targetCampaignId = campaignId || principal.campaignMemberships[0]?.campaignId;
      if (targetCampaignId) {
        const allowedBooths = await getAgentBoothScope(principal, targetCampaignId);
        if (allowedBooths !== null) {
          where.boothId = { in: allowedBooths };
        }
      }
    }

    if (gender && gender !== 'All') where.gender = gender.charAt(0);
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { epicNumber: { contains: query } },
        { houseNumber: { contains: query } },
        { household: { code: { contains: query } } },
      ];
    }


    const [total, voters] = await Promise.all([
      prisma.voter.count({ where }),
      prisma.voter.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { serialNumber: 'asc' },
        include: {
          household: { select: { id: true, code: true, address: true, status: true, aiConfidence: true } },
          ward: { select: { id: true, wardNumber: true, name: true } },
          booth: { select: { id: true, boothNumber: true, name: true, pollingStation: true } },
          fieldProvenances: { take: 3 },
        },
      }),
    ]);

    return apiSuccess(voters, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve voters', 500, String(err));
  }
}
