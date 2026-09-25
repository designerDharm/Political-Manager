import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (userId) where.userId = userId;

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
    const body = await req.json();
    let { campaignId, userId, createdById, scopeType, scopeTarget, taskType, notes, dueAt } = body;

    if (!userId || !scopeType || !taskType) {
      return apiError('VALIDATION_ERROR', 'User, scope type, and task type are required', 400);
    }

    // Verify or resolve campaign
    let campaign = campaignId ? await prisma.campaign.findUnique({ where: { id: campaignId } }) : null;
    if (!campaign) {
      campaign = await prisma.campaign.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
      if (!campaign) {
        campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: 'desc' } });
      }
    }

    if (!campaign) {
      return apiError('NOT_FOUND', 'No valid campaign found for assignment', 404);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return apiError('NOT_FOUND', 'Assignee user not found', 404);
    }

    // Verify creator exists
    let creator = createdById ? await prisma.user.findUnique({ where: { id: createdById } }) : null;
    if (!creator) {
      creator = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }) || user;
    }

    const assignment = await prisma.assignment.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        createdById: creator.id,
        scopeType,
        scopeTarget: scopeTarget || 'General',
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

    return apiSuccess(assignment, { created: true }, 201);
  } catch (err: any) {
    console.error('Error creating assignment in /api/v1/tasks:', err);
    return apiError('INTERNAL_ERROR', err.message || 'Failed to create assignment', 500, String(err));
  }
}

