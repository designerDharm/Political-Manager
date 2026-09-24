import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

// PATCH /api/v1/issues/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, priority, assigneeId, noteText, authorId } = body;

    const existing = await prisma.issue.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Issue not found', 404);
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
