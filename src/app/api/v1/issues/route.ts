import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
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
    const body = await req.json();
    let { campaignId, boothId, householdId, title, category, priority, description, reporterId, assigneeId } = body;

    if (!title || !category || !description) {
      return apiError('VALIDATION_ERROR', 'Title, category, and description are required', 400);
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

    // Resolve reporter
    let reporter = reporterId ? await prisma.user.findUnique({ where: { id: reporterId } }) : null;
    if (!reporter) {
      reporter = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      if (!reporter) {
        reporter = await prisma.user.findFirst();
      }
    }

    if (!reporter) {
      return apiError('NOT_FOUND', 'No valid user found to report issue', 404);
    }

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
        reporterId: reporter.id,
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

    return apiSuccess(issue, { created: true }, 201);
  } catch (err: any) {
    console.error('Error creating issue in /api/v1/issues:', err);
    return apiError('INTERNAL_ERROR', err.message || 'Failed to create issue', 500, String(err));
  }
}

