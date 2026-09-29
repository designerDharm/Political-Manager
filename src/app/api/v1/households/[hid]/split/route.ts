import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// POST /api/v1/households/[hid]/split - Split selected members into a new household
export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { hid } = params;
    const body = await req.json();
    const { voterIds, newHouseNumber, newAddress } = body;

    if (!voterIds || !Array.isArray(voterIds) || voterIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'At least one voter ID is required to split', 400);
    }

    const sourceHousehold = await prisma.household.findFirst({
      where: { OR: [{ id: hid }, { code: hid }] },
      include: { members: true },
    });

    if (!sourceHousehold) {
      return apiError('NOT_FOUND', `Household '${hid}' not found`, 404);
    }

    const access = await requireCampaignAccess(authResult.principal, sourceHousehold.campaignId);
    if ('error' in access) return access.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, sourceHousehold.campaignId);
      if (allowedBooths !== null && !allowedBooths.includes(sourceHousehold.boothId)) {
        return apiError('FORBIDDEN', 'Household is outside your assigned booth scope', 403);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.household.count({
        where: { campaignId: sourceHousehold.campaignId },
      });
      const code = `H-${String(count + 1).padStart(3, '0')}`;

      const votersToMove = await tx.voter.findMany({
        where: { id: { in: voterIds }, campaignId: sourceHousehold.campaignId },
      });

      if (votersToMove.length === 0) {
        throw new Error('No valid voters found to split');
      }

      const primaryContact = votersToMove[0];

      const newHousehold = await tx.household.create({
        data: {
          campaignId: sourceHousehold.campaignId,
          boothId: sourceHousehold.boothId,
          code,
          houseNumber: newHouseNumber || primaryContact.houseNumber,
          address: newAddress || sourceHousehold.address,
          primaryContactName: primaryContact.name,
          primaryContactId: primaryContact.id,
          status: 'Confirmed',
          isManuallyCorrected: true,
          evidenceSignals: JSON.stringify([`MANUAL_SPLIT_FROM_${sourceHousehold.code}`]),
          version: 1,
        },
      });

      await tx.voter.updateMany({
        where: { id: { in: votersToMove.map((v) => v.id) } },
        data: {
          householdId: newHousehold.id,
          householdSource: 'MANUAL_CORRECTION',
          householdConfidence: 1.0,
        },
      });

      for (const v of votersToMove) {
        await tx.voterFieldProvenance.create({
          data: {
            voterId: v.id,
            fieldName: 'householdId',
            previousValue: sourceHousehold.id,
            currentValue: newHousehold.id,
            sourceType: authResult.principal.platformRole === 'POLITICAL_AGENT' ? 'FIELD_AGENT_VERIFIED' : 'ADMIN_CORRECTION',
            verifiedById: authResult.principal.userId,
            verifiedAt: new Date(),
            reason: `Split from household ${sourceHousehold.code}`,
          },
        });
      }

      await tx.household.update({
        where: { id: sourceHousehold.id },
        data: { isManuallyCorrected: true, version: { increment: 1 } },
      });

      const campaign = await tx.campaign.findUnique({
        where: { id: sourceHousehold.campaignId },
        select: { organizationId: true },
      });
      if (campaign) {
        await tx.auditEvent.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId: sourceHousehold.campaignId,
            actorId: authResult.principal.userId,
            action: 'HOUSEHOLD_SPLIT',
            resource: `Household:${sourceHousehold.id}`,
            details: JSON.stringify({
              fromHouseholdCode: sourceHousehold.code,
              newHouseholdCode: newHousehold.code,
              movedMembersCount: votersToMove.length,
            }),
          },
        });
      }

      return newHousehold;
    });

    return apiSuccess(result, { message: 'Household split successfully' }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to split household', 500);
  }
}
