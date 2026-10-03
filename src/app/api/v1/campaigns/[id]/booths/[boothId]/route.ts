import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import { logAuditEvent } from '@/lib/api/audit';

// PATCH /api/v1/campaigns/[id]/booths/[boothId] - Update booth details
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; boothId: string } }
): Promise<Response> {
  try {
    const { id: campaignId, boothId } = params;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot edit booth configuration', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const booth = await prisma.booth.findFirst({
      where: { id: boothId, campaignId },
    });
    if (!booth) {
      return apiError('NOT_FOUND', 'Booth not found in this campaign', 404);
    }

    const body = await req.json();
    const { boothNumber, name, areaLocality, pollingStation, totalElectors, status, wardId, latitude, longitude } = body;

    const updateData: any = {};
    if (name !== undefined) {
      if (!name.trim()) return apiError('VALIDATION_ERROR', 'Booth name cannot be empty', 400);
      updateData.name = name.trim();
    }
    if (areaLocality !== undefined) updateData.areaLocality = areaLocality.trim();
    if (pollingStation !== undefined) updateData.pollingStation = pollingStation.trim();
    if (status !== undefined) updateData.status = status;
    if (totalElectors !== undefined) updateData.totalElectors = Math.max(0, Number(totalElectors));

    if (latitude !== undefined) {
      if (latitude === null) {
        updateData.latitude = null;
      } else {
        const lat = Number(latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          return apiError('VALIDATION_ERROR', 'Latitude must be a valid number between -90 and 90', 400);
        }
        updateData.latitude = lat;
      }
    }

    if (longitude !== undefined) {
      if (longitude === null) {
        updateData.longitude = null;
      } else {
        const lng = Number(longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          return apiError('VALIDATION_ERROR', 'Longitude must be a valid number between -180 and 180', 400);
        }
        updateData.longitude = lng;
      }
    }

    if (wardId !== undefined && wardId !== booth.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: wardId, campaignId },
      });
      if (!ward) {
        return apiError('NOT_FOUND', 'Target parent ward does not exist in this campaign', 404);
      }
      updateData.wardId = wardId;
    }

    if (boothNumber !== undefined && Number(boothNumber) !== booth.boothNumber) {
      const num = Number(boothNumber);
      if (isNaN(num) || num <= 0) {
        return apiError('VALIDATION_ERROR', 'Valid positive booth number is required', 400);
      }
      const conflict = await prisma.booth.findFirst({
        where: { campaignId, boothNumber: num, NOT: { id: boothId } },
      });
      if (conflict) {
        return apiError('CONFLICT', `Booth number ${num} already exists in this campaign`, 409);
      }
      updateData.boothNumber = num;
    }

    const updated = await prisma.booth.update({
      where: { id: boothId },
      data: updateData,
    });

    // Audit log if location changed
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const campaignRecord = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { organizationId: true },
      });
      if (campaignRecord) {
        await logAuditEvent({
          organizationId: campaignRecord.organizationId,
          campaignId,
          actorId: authResult.principal.userId,
          action: 'BOOTH_LOCATION_UPDATED',
          resource: `booth:${boothId}`,
          details: JSON.stringify({
            boothNumber: updated.boothNumber,
            latitude: updated.latitude,
            longitude: updated.longitude,
          }),
        }).catch(() => null);
      }
    }

    return apiSuccess(updated, { message: 'Booth updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update booth', 500, String(err));
  }
}

// DELETE /api/v1/campaigns/[id]/booths/[boothId] - Safe deletion check
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; boothId: string } }
): Promise<Response> {
  try {
    const { id: campaignId, boothId } = params;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot delete booths', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const booth = await prisma.booth.findFirst({
      where: { id: boothId, campaignId },
      include: {
        _count: {
          select: {
            voters: true,
            households: true,
            issues: true,
            visEvents: true,
            turnout: true,
          },
        },
      },
    });

    if (!booth) {
      return apiError('NOT_FOUND', 'Booth not found in this campaign', 404);
    }

    // Cascading integrity check: prevent deleting if voters or households exist
    if (booth._count.voters > 0 || booth._count.households > 0) {
      return apiError(
        'CONFLICT',
        `Cannot delete booth: It contains ${booth._count.voters} registered voters and ${booth._count.households} households. Data must be preserved.`,
        409
      );
    }

    await prisma.booth.delete({
      where: { id: boothId },
    });

    return apiSuccess({ deleted: true }, { message: 'Booth deleted successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to delete booth', 500, String(err));
  }
}
