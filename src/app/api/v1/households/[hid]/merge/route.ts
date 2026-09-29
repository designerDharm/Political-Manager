import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// POST /api/v1/households/[hid]/merge - Merge another household into this household
export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { hid } = params;
    const body = await req.json();
    const { targetHouseholdId } = body; // The household being merged INTO `hid`

    if (!targetHouseholdId) {
      return apiError('VALIDATION_ERROR', 'targetHouseholdId is required', 400);
    }

    const primaryHousehold = await prisma.household.findFirst({
      where: { OR: [{ id: hid }, { code: hid }] },
      include: { members: true },
    });

    if (!primaryHousehold) {
      return apiError('NOT_FOUND', `Primary household '${hid}' not found`, 404);
    }

    const access = await requireCampaignAccess(authResult.principal, primaryHousehold.campaignId);
    if ('error' in access) return access.error;

    const mergingHousehold = await prisma.household.findUnique({
      where: { id: targetHouseholdId },
      include: { members: true },
    });

    if (!mergingHousehold) {
      return apiError('NOT_FOUND', `Merging household not found`, 404);
    }

    if (primaryHousehold.campaignId !== mergingHousehold.campaignId) {
      return apiError('VALIDATION_ERROR', 'Cannot merge households across different campaigns', 400);
    }

    if (primaryHousehold.boothId !== mergingHousehold.boothId) {
      return apiError('VALIDATION_ERROR', 'Cannot merge households across different polling booths', 400);
    }

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, primaryHousehold.campaignId);
      if (allowedBooths !== null && !allowedBooths.includes(primaryHousehold.boothId)) {
        return apiError('FORBIDDEN', 'Household is outside your assigned booth scope', 403);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Reassign all members of mergingHousehold to primaryHousehold
      await tx.voter.updateMany({
        where: { householdId: mergingHousehold.id },
        data: {
          householdId: primaryHousehold.id,
          householdSource: 'MANUAL_CORRECTION',
          householdConfidence: 1.0,
        },
      });

      // Update provenance for moved voters
      for (const m of mergingHousehold.members) {
        await tx.voterFieldProvenance.create({
          data: {
            voterId: m.id,
            fieldName: 'householdId',
            previousValue: mergingHousehold.id,
            currentValue: primaryHousehold.id,
            sourceType: authResult.principal.platformRole === 'POLITICAL_AGENT' ? 'FIELD_AGENT_VERIFIED' : 'ADMIN_CORRECTION',
            verifiedById: authResult.principal.userId,
            verifiedAt: new Date(),
            reason: `Merged from household ${mergingHousehold.code} into ${primaryHousehold.code}`,
          },
        });
      }

      // Reassign interactions and issues
      await tx.interaction.updateMany({
        where: { householdId: mergingHousehold.id },
        data: { householdId: primaryHousehold.id },
      });

      await tx.issue.updateMany({
        where: { householdId: mergingHousehold.id },
        data: { householdId: primaryHousehold.id },
      });

      // Delete or archive the merged household
      await tx.household.delete({
        where: { id: mergingHousehold.id },
      });

      // Update primary household
      const updatedPrimary = await tx.household.update({
        where: { id: primaryHousehold.id },
        data: {
          isManuallyCorrected: true,
          status: 'Confirmed',
          version: { increment: 1 },
        },
        include: { members: true },
      });

      const campaign = await tx.campaign.findUnique({
        where: { id: primaryHousehold.campaignId },
        select: { organizationId: true },
      });
      if (campaign) {
        await tx.auditEvent.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId: primaryHousehold.campaignId,
            actorId: authResult.principal.userId,
            action: 'HOUSEHOLD_MERGED',
            resource: `Household:${primaryHousehold.id}`,
            details: JSON.stringify({
              keptHouseholdCode: primaryHousehold.code,
              mergedHouseholdCode: mergingHousehold.code,
              totalMembersAfterMerge: updatedPrimary.members.length,
            }),
          },
        });
      }

      return updatedPrimary;
    });

    return apiSuccess(result, { message: 'Households merged successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to merge households', 500);
  }
}
