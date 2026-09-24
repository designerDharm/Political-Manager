import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

// GET /api/v1/election-day?campaignId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    let whereClause: any = {};
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    const [turnoutSnapshots, visEvents, totalElectorsCount, activeBoothsCount] = await Promise.all([
      prisma.turnoutSnapshot.findMany({
        where: whereClause,
        include: {
          booth: { select: { id: true, boothNumber: true, name: true, totalElectors: true } },
        },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
      prisma.visEvent.findMany({
        where: whereClause,
        include: {
          voter: { select: { id: true, epicNumber: true, name: true, boothId: true, serialNumber: true } },
          booth: { select: { id: true, boothNumber: true, name: true } },
          agent: { select: { id: true, displayName: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      prisma.voter.count(campaignId ? { where: { campaignId } } : undefined),
      prisma.booth.count(campaignId ? { where: { campaignId } } : undefined),
    ]);

    const totalVisIssued = await prisma.visEvent.count({
      where: {
        ...whereClause,
        eventType: 'ISSUED',
      },
    });

    const latestTurnout = turnoutSnapshots.length > 0 ? turnoutSnapshots[0].percentage : 0;

    return apiSuccess({
      metrics: {
        totalElectors: totalElectorsCount,
        latestTurnoutPercentage: latestTurnout,
        totalVisIssued,
        activeBoothsCount,
      },
      turnoutSnapshots,
      recentVisEvents: visEvents,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve election day status', 500, String(err));
  }
}

// POST /api/v1/election-day (Record Turnout Snapshot or VIS issuance or incident)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, campaignId, boothId, turnoutHour, totalReported, percentage, voterId, agentId, assistance } = body;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    if (type === 'TURNOUT_SNAPSHOT') {
      if (!boothId || !turnoutHour || percentage === undefined) {
        return apiError('VALIDATION_ERROR', 'boothId, turnoutHour, and percentage are required for turnout snapshot', 400);
      }

      const snapshot = await prisma.turnoutSnapshot.create({
        data: {
          campaignId,
          boothId,
          turnoutHour,
          totalReported: Number(totalReported) || 0,
          percentage: Number(percentage),
          source: body.source || 'AUTHORIZED_POLLING_AGENT',
        },
      });

      return apiSuccess(snapshot, { message: 'Turnout snapshot recorded' }, 201);
    }

    if (type === 'VIS_ISSUE') {
      if (!voterId || !boothId || !agentId) {
        return apiError('VALIDATION_ERROR', 'voterId, boothId, and agentId are required to record VIS issuance', 400);
      }

      const visEvent = await prisma.visEvent.create({
        data: {
          campaignId,
          voterId,
          boothId,
          agentId,
          eventType: 'ISSUED',
          assistance: assistance || null,
        },
      });

      return apiSuccess(visEvent, { message: 'VIS issuance recorded. Strictly decoupled from voting ballot.' }, 201);
    }

    return apiError('INVALID_TYPE', 'Unknown election day action type. Supported: TURNOUT_SNAPSHOT, VIS_ISSUE', 400);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to record election day operation', 500, String(err));
  }
}
