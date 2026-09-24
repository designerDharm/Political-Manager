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
    const { campaignId, userId, createdById, scopeType, scopeTarget, taskType, notes, dueAt } = body;

    if (!userId || !scopeType || !taskType) {
      return apiError('VALIDATION_ERROR', 'User, scope type, and task type are required', 400);
    }

    const assignment = await prisma.assignment.create({
      data: {
        campaignId,
        userId,
        createdById: createdById || userId,
        scopeType,
        scopeTarget: scopeTarget || 'General',
        taskType,
        notes,
        dueAt: dueAt ? new Date(dueAt) : null,
        status: 'Active',
      },
    });

    return apiSuccess(assignment, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create assignment', 500, String(err));
  }
}
