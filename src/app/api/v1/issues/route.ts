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
    const { campaignId, boothId, householdId, title, category, priority, description, reporterId, assigneeId } = body;

    if (!title || !category || !description) {
      return apiError('VALIDATION_ERROR', 'Title, category, and description are required', 400);
    }

    const count = await prisma.issue.count();
    const code = `#ISS-2026-${String(count + 1).padStart(3, '0')}`;

    const issue = await prisma.issue.create({
      data: {
        campaignId,
        boothId,
        householdId,
        code,
        title,
        category,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        description,
        reporterId,
        assigneeId,
      },
    });

    return apiSuccess(issue, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create issue', 500, String(err));
  }
}
