import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const requestedUserId = searchParams.get('userId');

    // Campaign isolation check
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to tasks for this campaign is denied', 403);
      }
    }

    const where: any = {};
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (principal.platformRole !== 'SUPER_ADMIN') {
      where.campaignId = { in: principal.campaignMemberships.map((m) => m.campaignId) };
    }

    // Agent scoping: POLITICAL_AGENT can only view their own tasks
    if (principal.platformRole === 'POLITICAL_AGENT') {
      where.userId = principal.userId;
    } else if (requestedUserId) {
      where.userId = requestedUserId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(assignments);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve tasks', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    // Agents cannot create assignments
    if (principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to create assignments', 403);
    }

    const body = await req.json();
    let { campaignId, userId, scopeType, scopeTarget, taskType, notes, dueAt, boothId, wardId } = body;

    if (!userId || !scopeType || !taskType) {
      return apiError('VALIDATION_ERROR', 'User, scope type, and task type are required', 400);
    }

    // Strictly require that the campaignId is provided
    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required for task assignment', 400);
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    // Check campaign access for creator
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(campaign.id)) {
        return apiError('FORBIDDEN', 'Access to assign tasks in this campaign is denied', 403);
      }
    }

    // Verify target user has an active CampaignMembership in THIS campaign
    const membership = await prisma.campaignMembership.findFirst({
      where: { campaignId: campaign.id, userId, active: true },
      include: { user: true },
    });

    if (!membership) {
      return apiError(
        'FORBIDDEN',
        'Cross-campaign assignment rejected: Assignee is not an active member of this campaign',
        403
      );
    }

    const user = membership.user;

    // Validate location parameters strictly belong to this campaign
    if (boothId) {
      const booth = await prisma.booth.findFirst({
        where: { id: boothId, campaignId: campaign.id },
      });
      if (!booth) {
        return apiError('FORBIDDEN', 'Cross-campaign assignment rejected: Booth does not belong to this campaign', 403);
      }

      // Sync boothId to agent's scopeIds if it's a booth assignment
      let currentScopes: string[] = [];
      try {
        currentScopes = JSON.parse(membership.scopeIds || '[]');
      } catch {
        currentScopes = [];
      }
      if (!currentScopes.includes(boothId)) {
        currentScopes.push(boothId);
        await prisma.campaignMembership.update({
          where: { id: membership.id },
          data: {
            scopeType: 'BOOTH',
            scopeIds: JSON.stringify(currentScopes),
          },
        });
      }
    }

    if (wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: wardId, campaignId: campaign.id },
      });
      if (!ward) {
        return apiError('FORBIDDEN', 'Cross-campaign assignment rejected: Ward does not belong to this campaign', 403);
      }
    }

    const effectiveScopeTarget = scopeTarget || 'General';

    // Duplicate prevention: check if an identical active assignment already exists
    const existingActive = await prisma.assignment.findFirst({
      where: {
        campaignId: campaign.id,
        userId: user.id,
        scopeType,
        scopeTarget: effectiveScopeTarget,
        taskType,
        status: 'Active',
      },
    });

    if (existingActive) {
      return apiError('CONFLICT', `Agent already has an active assignment for ${taskType} in ${effectiveScopeTarget}`, 409);
    }

    // Creator is the authenticated session principal
    const creatorId = principal.userId;

    const assignment = await prisma.assignment.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        createdById: creatorId,
        scopeType,
        scopeTarget: effectiveScopeTarget,
        taskType,
        notes: notes || '',
        dueAt: dueAt ? new Date(dueAt) : null,
        status: 'Active',
      },
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    // Write audit event
    await prisma.auditEvent.create({
      data: {
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        actorId: creatorId,
        action: 'ASSIGNMENT_CREATED',
        resource: `Assignment:${assignment.id}`,
        details: JSON.stringify({
          assigneeId: user.id,
          assigneeName: user.displayName,
          scopeType,
          scopeTarget: effectiveScopeTarget,
          taskType,
          boothId: boothId || null,
        }),
      },
    });


    return apiSuccess(assignment, { created: true }, 201);
  } catch (err: any) {
    console.error('Error creating assignment in /api/v1/tasks:', err);
    return apiError('INTERNAL_ERROR', err.message || 'Failed to create assignment', 500, String(err));
  }
}


