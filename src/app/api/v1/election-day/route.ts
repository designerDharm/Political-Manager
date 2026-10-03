import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';
import { logAuditEvent } from '@/lib/api/audit';

// GET /api/v1/election-day?campaignId=...
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId') || principal.campaignMemberships[0]?.campaignId;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    const access = await requireCampaignAccess(principal, campaignId);
    if ('error' in access) return access.error;

    // Resolve Agent Booth Scope
    let agentAllowedBooths: string[] | null = null;
    if (principal.platformRole === 'POLITICAL_AGENT') {
      agentAllowedBooths = await getAgentBoothScope(principal, campaignId);
    }

    const boothWhere: any = { campaignId };
    if (agentAllowedBooths !== null) {
      boothWhere.id = { in: agentAllowedBooths };
    }

    // 1. Fetch Campaign configuration
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        electionName: true,
        electionDate: true,
        status: true,
        description: true,
        organizationId: true,
        targetVoters: true,
        estimatedVoters: true,
      },
    });

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    // Parse election-day operational state from campaign description or default
    let electionDayConfig = {
      status: 'NOT_STARTED', // NOT_STARTED, ACTIVE, CLOSED
      openedAt: null as string | null,
      closedAt: null as string | null,
      configuredBy: null as string | null,
    };

    if (campaign.description && campaign.description.includes('ELECTION_DAY_STATE:')) {
      try {
        const marker = 'ELECTION_DAY_STATE:';
        const jsonStr = campaign.description.substring(campaign.description.indexOf(marker) + marker.length);
        const parsed = JSON.parse(jsonStr);
        electionDayConfig = { ...electionDayConfig, ...parsed };
      } catch {
        // Fallback default
      }
    }

    // 2. Fetch Booths with counts and assignments
    const booths = await prisma.booth.findMany({
      where: boothWhere,
      orderBy: { boothNumber: 'asc' },
      include: {
        ward: { select: { id: true, wardNumber: true, name: true } },
        _count: {
          select: {
            voters: true,
            visEvents: true,
            issues: true,
          },
        },
      },
    });

    // 3. Fetch active agent assignments in campaign
    const activeAssignments = await prisma.assignment.findMany({
      where: { campaignId, status: 'Active' },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    // 4. Fetch recent Turnout snapshots
    const turnoutWhere: any = { campaignId };
    if (agentAllowedBooths !== null) {
      turnoutWhere.boothId = { in: agentAllowedBooths };
    }

    const [turnoutSnapshots, recentVisEvents, totalElectors] = await Promise.all([
      prisma.turnoutSnapshot.findMany({
        where: turnoutWhere,
        include: {
          booth: { select: { id: true, boothNumber: true, name: true, totalElectors: true } },
        },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
      prisma.visEvent.findMany({
        where: turnoutWhere,
        include: {
          voter: { select: { id: true, epicNumber: true, name: true, boothId: true, serialNumber: true } },
          booth: { select: { id: true, boothNumber: true, name: true } },
          agent: { select: { id: true, displayName: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      prisma.voter.count({ where: boothWhere }),
    ]);

    // Compute booth-level summaries
    const boothSummaries = booths.map((b) => {
      const assignedAgents = activeAssignments
        .filter((a) => {
          if (a.scopeType === 'BOOTH') {
            return (
              a.scopeTarget === b.id ||
              a.scopeTarget === `Booth ${b.boothNumber}` ||
              a.scopeTarget.includes(`Booth ${b.boothNumber}`) ||
              a.scopeTarget.includes(b.name)
            );
          }
          if (a.scopeType === 'WARD') {
            return (
              a.scopeTarget === b.wardId ||
              a.scopeTarget === `Ward ${b.ward.wardNumber}` ||
              a.scopeTarget.includes(`Ward ${b.ward.wardNumber}`)
            );
          }
          return a.scopeType === 'ALL';
        })
        .map((a) => ({ id: a.user.id, name: a.user.displayName, email: a.user.email }));

      const latestBoothTurnout = turnoutSnapshots.find((t) => t.boothId === b.id);

      return {
        id: b.id,
        boothNumber: b.boothNumber,
        name: b.name,
        wardId: b.wardId,
        wardNumber: b.ward.wardNumber,
        wardName: b.ward.name,
        pollingStation: b.pollingStation,
        totalElectors: b._count.voters,
        registeredVoters: b._count.voters,
        estimatedElectorate: b.totalElectors && b.totalElectors > 0 ? b.totalElectors : null,
        visIssuedCount: b._count.visEvents,
        openIssuesCount: b._count.issues,
        assignedAgents,
        latestTurnout: latestBoothTurnout
          ? {
              totalReported: latestBoothTurnout.totalReported,
              percentage: latestBoothTurnout.percentage,
              hour: latestBoothTurnout.turnoutHour,
              source: latestBoothTurnout.source,
              recordedAt: latestBoothTurnout.recordedAt,
            }
          : null,
      };
    });

    const totalVisCount = booths.reduce((acc, b) => acc + b._count.visEvents, 0);
    const totalIssuesCount = booths.reduce((acc, b) => acc + b._count.issues, 0);
    const campaignEstimatedElectorate = campaign.estimatedVoters || campaign.targetVoters || null;

    return apiSuccess({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        electionName: campaign.electionName,
        electionDate: campaign.electionDate,
        electionDayStatus: electionDayConfig.status,
        openedAt: electionDayConfig.openedAt,
        closedAt: electionDayConfig.closedAt,
      },
      metrics: {
        totalElectors, // Registered voters from Voter table
        totalRegisteredElectors: totalElectors,
        estimatedElectorate: campaignEstimatedElectorate,
        totalBooths: booths.length,
        totalVisIssued: totalVisCount,
        openIssuesCount: totalIssuesCount,
        recentTurnoutPercentage: turnoutSnapshots[0]?.percentage || 0,
      },
      boothSummaries,
      turnoutSnapshots,
      recentVisEvents,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve election day status', 500, String(err));
  }
}

// POST /api/v1/election-day - Handle operations: ACTIVATE, CLOSE, VIS_ISSUE, TURNOUT_SNAPSHOT
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const body = await req.json();
    const { type, campaignId } = body;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    const access = await requireCampaignAccess(principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    // -------------------------------------------------------------
    // OPERATION 1: ACTIVATE ELECTION DAY (Admin only)
    // -------------------------------------------------------------
    if (type === 'ACTIVATE_ELECTION_DAY') {
      if (principal.platformRole === 'POLITICAL_AGENT') {
        return apiError('FORBIDDEN', 'Political agents cannot activate election day', 403);
      }

      const openedAt = new Date().toISOString();
      const stateObj = {
        status: 'ACTIVE',
        openedAt,
        closedAt: null,
        configuredBy: principal.userId,
      };

      // Strip previous state marker if present
      let baseDesc = campaign.description || '';
      if (baseDesc.includes('ELECTION_DAY_STATE:')) {
        baseDesc = baseDesc.substring(0, baseDesc.indexOf('ELECTION_DAY_STATE:')).trim();
      }
      const newDesc = `${baseDesc}\nELECTION_DAY_STATE:${JSON.stringify(stateObj)}`.trim();

      await prisma.$transaction([
        prisma.campaign.update({
          where: { id: campaignId },
          data: {
            description: newDesc,
            electionDate: campaign.electionDate || new Date(),
          },
        }),
      ]);

      await logAuditEvent({
        organizationId: campaign.organizationId,
        campaignId,
        actorId: principal.userId,
        action: 'ELECTION_DAY_ACTIVATED',
        resource: `campaign:${campaignId}`,
        details: JSON.stringify({
          configuredBy: principal.userId,
          openedAt,
        }),
      });

      return apiSuccess({ status: 'ACTIVE', openedAt }, { message: 'Election Day operations activated' });
    }

    // -------------------------------------------------------------
    // OPERATION 2: CLOSE ELECTION DAY (Admin only)
    // -------------------------------------------------------------
    if (type === 'CLOSE_ELECTION_DAY') {
      if (principal.platformRole === 'POLITICAL_AGENT') {
        return apiError('FORBIDDEN', 'Political agents cannot close election day', 403);
      }

      const closedAt = new Date().toISOString();
      const stateObj = {
        status: 'CLOSED',
        closedAt,
        configuredBy: principal.userId,
      };

      let baseDesc = campaign.description || '';
      if (baseDesc.includes('ELECTION_DAY_STATE:')) {
        baseDesc = baseDesc.substring(0, baseDesc.indexOf('ELECTION_DAY_STATE:')).trim();
      }
      const newDesc = `${baseDesc}\nELECTION_DAY_STATE:${JSON.stringify(stateObj)}`.trim();

      await prisma.$transaction([
        prisma.campaign.update({
          where: { id: campaignId },
          data: { description: newDesc },
        }),
      ]);

      await logAuditEvent({
        organizationId: campaign.organizationId,
        campaignId,
        actorId: principal.userId,
        action: 'ELECTION_DAY_CLOSED',
        resource: `campaign:${campaignId}`,
        details: JSON.stringify({
          closedBy: principal.userId,
          closedAt,
        }),
      });

      return apiSuccess({ status: 'CLOSED', closedAt }, { message: 'Election Day operations closed' });
    }

    // -------------------------------------------------------------
    // OPERATION 3: VIS ISSUANCE / REISSUE (Admin or Agent)
    // -------------------------------------------------------------
    if (type === 'VIS_ISSUE' || type === 'VIS_REISSUE') {
      const { voterId, boothId, assistance, isReissue } = body;

      if (!voterId || !boothId) {
        return apiError('VALIDATION_ERROR', 'voterId and boothId are required to record VIS issuance', 400);
      }

      // Verify voter exists in this campaign
      const voter = await prisma.voter.findUnique({
        where: { id: voterId },
        include: {
          booth: true,
          ward: true,
        },
      });

      if (!voter || voter.campaignId !== campaignId) {
        return apiError('NOT_FOUND', 'Voter does not belong to specified campaign', 404);
      }

      // Anti-IDOR: verify voter actually belongs to the specified booth
      if (voter.boothId !== boothId) {
        return apiError('BAD_REQUEST', 'Voter belongs to a different booth. Cross-booth issuance forbidden.', 400);
      }

      // Enforce Agent Booth Scope
      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, campaignId);
        if (allowedBooths !== null && !allowedBooths.includes(voter.boothId)) {
          return apiError('FORBIDDEN', 'This voter is outside your assigned polling station scope', 403);
        }
      }

      // Check existing VIS history for this voter
      const existingVis = await prisma.visEvent.findFirst({
        where: { voterId, campaignId },
        orderBy: { occurredAt: 'desc' },
      });

      const wantsReissue = isReissue || type === 'VIS_REISSUE';

      if (existingVis && !wantsReissue) {
        return apiError(
          'CONFLICT',
          `VIS already issued to ${voter.name} (EPIC: ${voter.epicNumber}). Use reissue if a reprint is requested.`,
          409
        );
      }

      const eventType = wantsReissue ? 'REPRINTED' : 'ISSUED';
      const referenceCode = `VIS-${voter.epicNumber}-${Date.now().toString(36).toUpperCase()}`;

      const visEvent = await prisma.$transaction(async (tx) => {
        const record = await tx.visEvent.create({
          data: {
            campaignId,
            voterId,
            boothId,
            agentId: principal.userId,
            eventType,
            assistance: assistance || null,
          },
          include: {
            voter: {
              select: {
                id: true,
                name: true,
                epicNumber: true,
                serialNumber: true,
                age: true,
                gender: true,
                guardianName: true,
                houseNumber: true,
              },
            },
            booth: {
              select: {
                id: true,
                boothNumber: true,
                name: true,
                pollingStation: true,
              },
            },
          },
        });

        // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
        await tx.auditEvent.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId,
            actorId: principal.userId,
            action: wantsReissue ? 'VIS_REISSUED' : 'VIS_ISSUED',
            resource: `vis:${record.id}`,
            details: JSON.stringify({
              voterId,
              boothId,
              epicNumber: voter.epicNumber,
              referenceCode,
              eventType,
              agentId: principal.userId,
            }),
          },
        });

        return record;
      });

      return apiSuccess(
        {
          ...visEvent,
          referenceCode,
          legalNotice:
            'Neutral Voter Information Slip for polling booth facilitation only. Strictly decoupled from ballot cast.',
        },
        {
          message: wantsReissue
            ? 'VIS reissued successfully'
            : 'VIS issuance recorded. Strictly decoupled from voting ballot.',
        },
        201
      );
    }

    // -------------------------------------------------------------
    // OPERATION 4: RECORD TURNOUT SNAPSHOT (Admin or Agent)
    // -------------------------------------------------------------
    if (type === 'TURNOUT_SNAPSHOT') {
      const { boothId, turnoutHour, totalReported, percentage, source } = body;

      if (!boothId || !turnoutHour) {
        return apiError('VALIDATION_ERROR', 'boothId and turnoutHour are required for turnout snapshot', 400);
      }

      // Verify Booth belongs to campaign
      const booth = await prisma.booth.findFirst({
        where: { id: boothId, campaignId },
      });
      if (!booth) {
        return apiError('NOT_FOUND', 'Booth does not belong to specified campaign', 404);
      }

      // Enforce Agent Booth Scope
      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, campaignId);
        if (allowedBooths !== null && !allowedBooths.includes(boothId)) {
          return apiError('FORBIDDEN', 'Cannot report turnout for unassigned booth', 403);
        }
      }

      const reported = Number(totalReported);
      if (isNaN(reported) || reported < 0) {
        return apiError('VALIDATION_ERROR', 'Total reported turnout count cannot be negative', 400);
      }

      // Authoritative electors from published Voter table, falling back to booth.totalElectors if no registered voters yet
      const registeredCount = await prisma.voter.count({ where: { boothId: booth.id, campaignId } });
      const electors = registeredCount > 0 ? registeredCount : (booth.totalElectors && booth.totalElectors > 0 ? booth.totalElectors : 0);

      if (electors > 0 && reported > electors) {
        return apiError(
          'VALIDATION_ERROR',
          `Reported turnout (${reported}) exceeds booth total registered electors (${electors})`,
          400
        );
      }

      // Server-authoritative turnout percentage calculation: 0 <= pct <= 100
      const pct = electors > 0 ? Math.min(100, Math.max(0, Math.round((reported / electors) * 1000) / 10)) : 0;

      const snapshot = await prisma.$transaction(async (tx) => {
        const s = await tx.turnoutSnapshot.create({
          data: {
            campaignId,
            boothId,
            turnoutHour: turnoutHour.trim(),
            totalReported: reported,
            percentage: pct,
            source: source || (principal.platformRole === 'CAMPAIGN_ADMIN' ? 'OFFICIAL_ENTRY' : 'AUTHORIZED_POLLING_AGENT'),
          },
          include: {
            booth: { select: { id: true, boothNumber: true, name: true } },
          },
        });

        // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
        await tx.auditEvent.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId,
            actorId: principal.userId,
            action: 'TURNOUT_RECORDED',
            resource: `turnout:${s.id}`,
            details: JSON.stringify({
              boothId,
              boothNumber: booth.boothNumber,
              turnoutHour: s.turnoutHour,
              totalReported: s.totalReported,
              percentage: s.percentage,
              source: s.source,
            }),
          },
        });

        return s;
      });

      return apiSuccess(snapshot, { message: 'Aggregate turnout snapshot recorded' }, 201);
    }

    return apiError(
      'INVALID_TYPE',
      'Unknown election day action type. Supported: ACTIVATE_ELECTION_DAY, CLOSE_ELECTION_DAY, VIS_ISSUE, VIS_REISSUE, TURNOUT_SNAPSHOT',
      400
    );
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to record election day operation', 500, String(err));
  }
}
