import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';
import { logAuditEvent } from '@/lib/api/audit';

// POST /api/v1/households/[hid]/confirm - Confirm suggested household
export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { hid } = params;
    const household = await prisma.household.findFirst({
      where: { OR: [{ id: hid }, { code: hid }] },
      include: { booth: true },
    });

    if (!household) {
      return apiError('NOT_FOUND', `Household '${hid}' not found`, 404);
    }

    const access = await requireCampaignAccess(authResult.principal, household.campaignId);
    if ('error' in access) return access.error;

    // Agent scope check
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, household.campaignId);
      if (allowedBooths !== null && !allowedBooths.includes(household.boothId)) {
        return apiError('FORBIDDEN', 'Household is outside your assigned booth scope', 403);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const h = await tx.household.update({
        where: { id: household.id },
        data: {
          status: 'Confirmed',
          isManuallyCorrected: true,
          version: { increment: 1 },
        },
      });

      await tx.voter.updateMany({
        where: { householdId: household.id },
        data: {
          householdSource: 'CONFIRMED',
        },
      });

      const campaign = await tx.campaign.findUnique({
        where: { id: household.campaignId },
        select: { organizationId: true },
      });

      if (campaign) {
        await logAuditEvent({
          organizationId: campaign.organizationId,
          campaignId: household.campaignId,
          actorId: authResult.principal.userId,
          action: 'HOUSEHOLD_CONFIRMED',
          resource: `Household:${household.id}`,
          details: JSON.stringify({ householdCode: household.code }),
        }, tx);
      }

      return h;
    });

    return apiSuccess(updated, { message: 'Household confirmed successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to confirm household', 500, String(err));
  }
}
