import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import { runCampaignHouseholdGrouping } from '@/lib/households/groupingEngine';

// POST /api/v1/households/grouping/run - Run grouping engine on campaign voters
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    // RBAC: Only Super Admin and Campaign Admin can trigger campaign-wide grouping
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to run campaign-wide grouping', 403);
    }

    const body = await req.json();
    const { campaignId, boothId } = body;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    const result = await runCampaignHouseholdGrouping(campaignId, boothId);

    // Audit Event
    await prisma.auditEvent.create({
      data: {
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        actorId: authResult.principal.userId,
        action: 'HOUSEHOLD_SUGGESTED',
        resource: `Campaign:${campaign.id}`,
        details: JSON.stringify(result),
      },
    });

    return apiSuccess(result, { message: 'Household grouping executed successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to execute household grouping', 500, String(err));
  }
}
