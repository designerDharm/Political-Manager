import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// GET /api/v1/tasks/[id] - Get task details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { id } = params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        campaign: true,
        user: { select: { id: true, displayName: true, email: true, role: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    if (!assignment) {
      return apiError('NOT_FOUND', 'Assignment not found', 404);
    }

    const access = await requireCampaignAccess(principal, assignment.campaignId);
    if ('error' in access) return access.error;

    if (principal.platformRole === 'POLITICAL_AGENT' && assignment.userId !== principal.userId) {
      return apiError('FORBIDDEN', 'Access denied to another agent assignment', 403);
    }

    return apiSuccess(assignment);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve task', 500, String(err));
  }
}

// PATCH /api/v1/tasks/[id] - Modify status, assignee, or scope
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { id } = params;
    const body = await req.json();
    const { status, notes, dueAt, userId, scopeTarget } = body;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!assignment) {
      return apiError('NOT_FOUND', 'Assignment not found', 404);
    }

    const access = await requireCampaignAccess(principal, assignment.campaignId);
    if ('error' in access) return access.error;

    // Agent can only mark their own task Completed / In Progress, cannot change assignee or scopeTarget
    if (principal.platformRole === 'POLITICAL_AGENT') {
      if (assignment.userId !== principal.userId) {
        return apiError('FORBIDDEN', 'Cannot modify another agent assignment', 403);
      }
      if (userId || scopeTarget) {
        return apiError('FORBIDDEN', 'Agents cannot reassign or change task scope', 403);
      }
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
    if (userId !== undefined && principal.platformRole !== 'POLITICAL_AGENT') updateData.userId = userId;
    if (scopeTarget !== undefined && principal.platformRole !== 'POLITICAL_AGENT') updateData.scopeTarget = scopeTarget;

    const updated = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: assignment.campaign.organizationId,
        campaignId: assignment.campaignId,
        actorId: principal.userId,
        action: status === 'Cancelled' ? 'ASSIGNMENT_CANCELLED' : 'ASSIGNMENT_UPDATED',
        resource: `Assignment:${assignment.id}`,
        details: JSON.stringify({
          updatedFields: Object.keys(updateData),
          newStatus: updated.status,
        }),
      },
    });

    return apiSuccess(updated, { message: 'Assignment updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update assignment', 500, String(err));
  }
}
