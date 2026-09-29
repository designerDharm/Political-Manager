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
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Campaign isolation check
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to issues for this campaign is denied', 403);
      }
    }

    const where: any = {};
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (principal.platformRole !== 'SUPER_ADMIN') {
      where.campaignId = { in: principal.campaignMemberships.map((m) => m.campaignId) };
    }

    if (category) where.category = category;
    if (status) where.status = status;

    const issues = await prisma.issue.findMany({
      where,
      include: {
        household: { select: { id: true, code: true, address: true } },
        booth: { select: { id: true, boothNumber: true, name: true } },
        reporter: { select: { id: true, displayName: true } },
        assignee: { select: { id: true, displayName: true } },
        notes: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(issues);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve issues', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const body = await req.json();
    let { campaignId, boothId, householdId, title, category, priority, description, assigneeId } = body;

    if (!title || !category || !description) {
      return apiError('VALIDATION_ERROR', 'Title, category, and description are required', 400);
    }

    // Campaign access check
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to create issue in this campaign is denied', 403);
      }
    }

    // Resolve campaign
    let campaign = campaignId ? await prisma.campaign.findUnique({ where: { id: campaignId } }) : null;
    if (!campaign) {
      campaign = await prisma.campaign.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
      if (!campaign) {
        campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: 'desc' } });
      }
    }

    if (!campaign) {
      return apiError('NOT_FOUND', 'No active campaign found for issue', 404);
    }

    // Booth scope check for Political Agent
    if (principal.platformRole === 'POLITICAL_AGENT' && boothId) {
      const allowedBooths = await getAgentBoothScope(principal, campaign.id);
      if (allowedBooths !== null && !allowedBooths.includes(boothId)) {
        return apiError('FORBIDDEN', 'Cannot report issue for booth outside your assigned scope', 403);
      }
    }

    // Authoritative reporter is the authenticated session principal
    const reporterId = principal.userId;

    // Resolve assignee if passed
    let effectiveAssigneeId = null;
    if (assigneeId) {
      const assigneeExists = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assigneeExists) effectiveAssigneeId = assigneeExists.id;
    }

    const count = await prisma.issue.count();
    const code = `#ISS-2026-${String(count + 1).padStart(3, '0')}`;

    const issue = await prisma.issue.create({
      data: {
        campaignId: campaign.id,
        boothId: boothId || null,
        householdId: householdId || null,
        code,
        title: title.trim(),
        category: category.trim(),
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        description: description.trim(),
        reporterId,
        assigneeId: effectiveAssigneeId,
      },
      include: {
        household: true,
        booth: true,
        reporter: { select: { id: true, displayName: true } },
        assignee: { select: { id: true, displayName: true } },
        notes: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        actorId: reporterId,
        action: 'ISSUE_CREATED',
        resource: `Issue:${issue.id}`,
        details: JSON.stringify({
          code: issue.code,
          title: issue.title,
          category: issue.category,
          priority: issue.priority,
          householdId: issue.householdId,
        }),
      },
    });

    return apiSuccess(issue, { created: true }, 201);
  } catch (err: any) {
    console.error('Error creating issue in /api/v1/issues:', err);
    return apiError('INTERNAL_ERROR', err.message || 'Failed to create issue', 500, String(err));
  }
}


