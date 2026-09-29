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
    const boothId = searchParams.get('boothId');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const query = searchParams.get('q')?.trim();
    const statusFilter = searchParams.get('status');

    // Campaign isolation check
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to this campaign households is denied', 403);
      }
    }

    const where: any = {};
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (principal.platformRole !== 'SUPER_ADMIN') {
      where.campaignId = { in: principal.campaignMemberships.map((m) => m.campaignId) };
    }

    // Agent Booth Scoping
    if (principal.platformRole === 'POLITICAL_AGENT' && campaignId) {
      const allowedBooths = await getAgentBoothScope(principal, campaignId);
      if (allowedBooths !== null) {
        if (boothId) {
          if (!allowedBooths.includes(boothId)) {
            return apiError('FORBIDDEN', 'Access to this booth is not within your assignment scope', 403);
          }
          where.boothId = boothId;
        } else {
          where.boothId = { in: allowedBooths };
        }
      } else if (boothId) {
        where.boothId = boothId;
      }
    } else if (boothId) {
      where.boothId = boothId;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'NEEDS_REVIEW') {
        where.status = 'NeedsReview';
      } else if (statusFilter === 'CONFIRMED') {
        where.status = { in: ['Confirmed', 'Verified'] };
      } else if (statusFilter === 'SUGGESTED') {
        where.status = 'Suggested';
      } else {
        where.status = statusFilter;
      }
    }

    if (query) {
      where.OR = [
        { code: { contains: query, mode: 'insensitive' } },
        { houseNumber: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { primaryContactName: { contains: query, mode: 'insensitive' } },
        { members: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { members: { some: { epicNumber: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const [total, households] = await Promise.all([
      prisma.household.count({ where }),
      prisma.household.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          members: {
            select: {
              id: true,
              name: true,
              age: true,
              gender: true,
              epicNumber: true,
              relationshipType: true,
              guardianName: true,
              roleInHousehold: true,
              householdSource: true,
            },
          },
          booth: {
            select: {
              id: true,
              boothNumber: true,
              name: true,
              ward: { select: { id: true, wardNumber: true, name: true } },
            },
          },
          interactions: { take: 3, orderBy: { occurredAt: 'desc' } },
        },
        orderBy: { code: 'asc' },
      }),
    ]);

    // Summary counts for review tabs
    const counts = await prisma.household.groupBy({
      by: ['status'],
      where: campaignId ? { campaignId } : {},
      _count: true,
    });

    const totalVotersCount = campaignId ? await prisma.voter.count({ where: { campaignId } }) : 0;
    const ungroupedVotersCount = campaignId ? await prisma.voter.count({ where: { campaignId, householdId: null } }) : 0;

    return apiSuccess(households, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalHouseholds: total,
        totalVoters: totalVotersCount,
        ungroupedVoters: ungroupedVotersCount,
        statusBreakdown: counts,
      },
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve households', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const body = await req.json();
    const { campaignId, boothId, code, address, houseNumber, primaryContactName } = body;

    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to create household in this campaign is denied', 403);
      }
    }

    if (!code || !address) {
      return apiError('VALIDATION_ERROR', 'Household code and address are required', 400);
    }

    const household = await prisma.household.create({
      data: {
        campaignId,
        boothId,
        code,
        address,
        houseNumber: houseNumber || '',
        primaryContactName,
        status: 'Pending',
        version: 1,
      },
    });

    return apiSuccess(household, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create household', 500, String(err));
  }
}
