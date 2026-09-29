import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// PATCH /api/v1/issues/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const body = await req.json();
    const { status, priority, assigneeId, noteText } = body;

    const existing = await prisma.issue.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Issue not found', 404);
    }

    const access = await requireCampaignAccess(principal, existing.campaignId);
    if ('error' in access) return access.error;

    if (principal.platformRole === 'POLITICAL_AGENT' && existing.boothId) {
      const allowedBooths = await getAgentBoothScope(principal, existing.campaignId);
      if (allowedBooths !== null && !allowedBooths.includes(existing.boothId)) {
        return apiError('FORBIDDEN', 'Cannot update issue outside assigned booth scope', 403);
      }
    }

    const updated = await prisma.issue.update({
      where: { id: params.id },
      data: {
        status: status || existing.status,
        priority: priority || existing.priority,
        assigneeId: assigneeId !== undefined ? assigneeId : existing.assigneeId,
      },
      include: {
        notes: true,
        assignee: true,
      },
    });

    if (noteText) {
      await prisma.issueNote.create({
        data: {
          issueId: params.id,
          authorName: body.authorName || 'Campaign Staff',
          content: noteText,
        },
      });
    }

    return apiSuccess(updated, { message: 'Issue successfully updated' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to update issue', 500, String(err));
  }
}
