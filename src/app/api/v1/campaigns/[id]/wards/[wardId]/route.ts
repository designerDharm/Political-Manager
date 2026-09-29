import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// PATCH /api/v1/campaigns/[id]/wards/[wardId] - Update ward name / locality
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; wardId: string } }
): Promise<Response> {
  try {
    const { id: campaignId, wardId } = params;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot edit wards', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const ward = await prisma.ward.findFirst({
      where: { id: wardId, campaignId },
    });
    if (!ward) {
      return apiError('NOT_FOUND', 'Ward not found in this campaign', 404);
    }

    const body = await req.json();
    const { name, wardNumber, localityType } = body;

    const updateData: any = {};
    if (name !== undefined) {
      if (!name.trim()) return apiError('VALIDATION_ERROR', 'Ward name cannot be empty', 400);
      updateData.name = name.trim();
    }
    if (localityType !== undefined) {
      updateData.localityType = localityType;
    }
    if (wardNumber !== undefined && Number(wardNumber) !== ward.wardNumber) {
      const conflict = await prisma.ward.findFirst({
        where: { campaignId, wardNumber: Number(wardNumber), NOT: { id: wardId } },
      });
      if (conflict) {
        return apiError('CONFLICT', `Ward number ${wardNumber} already exists in this campaign`, 409);
      }
      updateData.wardNumber = Number(wardNumber);
    }

    const updated = await prisma.ward.update({
      where: { id: wardId },
      data: updateData,
    });

    return apiSuccess(updated, { message: 'Ward updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update ward', 500, String(err));
  }
}

// DELETE /api/v1/campaigns/[id]/wards/[wardId] - Safe deletion check
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; wardId: string } }
): Promise<Response> {
  try {
    const { id: campaignId, wardId } = params;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot delete wards', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const ward = await prisma.ward.findFirst({
      where: { id: wardId, campaignId },
      include: {
        _count: {
          select: { booths: true, voters: true },
        },
      },
    });

    if (!ward) {
      return apiError('NOT_FOUND', 'Ward not found in this campaign', 404);
    }

    // Cascading integrity check: prevent deleting if booths or voters exist
    if (ward._count.booths > 0 || ward._count.voters > 0) {
      return apiError(
        'CONFLICT',
        `Cannot delete ward: It contains ${ward._count.booths} polling booths and ${ward._count.voters} registered voters. Delete or reassign children first.`,
        409
      );
    }

    await prisma.ward.delete({
      where: { id: wardId },
    });

    return apiSuccess({ deleted: true }, { message: 'Ward deleted successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to delete ward', 500, String(err));
  }
}
