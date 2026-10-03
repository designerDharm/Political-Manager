import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// POST /api/v1/households/[hid]/move-member - Move a voter to another household or new household
export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { hid } = params;
    const body = await req.json();
    const { voterId, targetHouseholdId, createNewHousehold, newHouseNumber, newAddress } = body;

    if (!voterId) {
      return apiError('VALIDATION_ERROR', 'Voter ID is required', 400);
    }

    const sourceHousehold = await prisma.household.findFirst({
      where: { OR: [{ id: hid }, { code: hid }] },
    });

    if (!sourceHousehold) {
      return apiError('NOT_FOUND', `Source household '${hid}' not found`, 404);
    }

    const access = await requireCampaignAccess(authResult.principal, sourceHousehold.campaignId);
    if ('error' in access) return access.error;

    // Agent booth scope check
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, sourceHousehold.campaignId);
      if (allowedBooths !== null && !allowedBooths.includes(sourceHousehold.boothId)) {
        return apiError('FORBIDDEN', 'Source household is outside your assigned booth scope', 403);
      }
    }

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
    });

    if (!voter || voter.campaignId !== sourceHousehold.campaignId) {
      return apiError('NOT_FOUND', 'Voter not found in this campaign', 404);
    }

    // Atomic Move Transaction
    const result = await prisma.$transaction(async (tx) => {
      let destinationHouseholdId = targetHouseholdId;

      if (createNewHousehold) {
        // Count existing households to generate next code
        const count = await tx.household.count({
          where: { campaignId: sourceHousehold.campaignId },
        });
        const code = `H-${String(count + 1).padStart(3, '0')}`;

        const newH = await tx.household.create({
          data: {
            campaignId: sourceHousehold.campaignId,
            boothId: sourceHousehold.boothId,
            code,
            houseNumber: newHouseNumber || voter.houseNumber || 'New',
            address: newAddress || `House ${newHouseNumber || voter.houseNumber}, Booth Area`,
            primaryContactName: voter.name,
            primaryContactId: voter.id,
            status: 'Confirmed',
            isManuallyCorrected: true,
            evidenceSignals: JSON.stringify(['MANUAL_SPLIT_NEW_HOUSEHOLD']),
            version: 1,
          },
        });
        destinationHouseholdId = newH.id;
      } else if (destinationHouseholdId) {
        const dest = await tx.household.findUnique({
          where: { id: destinationHouseholdId },
        });
        if (!dest || dest.campaignId !== sourceHousehold.campaignId) {
          throw new Error('Destination household not found in same campaign');
        }

        // Agent scope check on destination
        if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
          const allowedBooths = await getAgentBoothScope(authResult.principal, sourceHousehold.campaignId);
          if (allowedBooths !== null && !allowedBooths.includes(dest.boothId)) {
            throw new Error('FORBIDDEN: Target household is outside your assigned booth scope');
          }
        }

        // Mark destination as manually corrected
        await tx.household.update({
          where: { id: dest.id },
          data: { isManuallyCorrected: true, version: { increment: 1 } },
        });
      }

      // Update voter membership with manual correction precedence
      const updatedVoter = await tx.voter.update({
        where: { id: voter.id },
        data: {
          householdId: destinationHouseholdId || null,
          householdSource: 'MANUAL_CORRECTION',
          householdConfidence: 1.0,
        },
      });

      // Record field provenance
      await tx.voterFieldProvenance.create({
        data: {
          voterId: voter.id,
          fieldName: 'householdId',
          previousValue: sourceHousehold.id,
          currentValue: destinationHouseholdId || 'UNGROUPED',
          sourceType: authResult.principal.platformRole === 'POLITICAL_AGENT' ? 'FIELD_AGENT_VERIFIED' : 'ADMIN_CORRECTION',
          verifiedById: authResult.principal.userId,
          verifiedAt: new Date(),
          reason: 'Manual household member relocation',
        },
      });

      // Mark source household as manually corrected
      await tx.household.update({
        where: { id: sourceHousehold.id },
        data: { isManuallyCorrected: true, version: { increment: 1 } },
      });

      // Audit event
      const campaign = await tx.campaign.findUnique({
        where: { id: sourceHousehold.campaignId },
        select: { organizationId: true },
      });
      if (campaign) {
        // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
        await tx.auditEvent.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId: sourceHousehold.campaignId,
            actorId: authResult.principal.userId,
            action: 'HOUSEHOLD_MEMBER_MOVED',
            resource: `Voter:${voter.id}`,
            details: JSON.stringify({
              voterName: voter.name,
              fromHouseholdId: sourceHousehold.id,
              toHouseholdId: destinationHouseholdId,
            }),
          },
        });
      }

      return {
        voterId: voter.id,
        fromHouseholdId: sourceHousehold.id,
        toHouseholdId: destinationHouseholdId,
      };
    });

    return apiSuccess(result, { message: 'Member moved successfully with manual correction provenance' });
  } catch (err: any) {
    const isForbidden = err.message?.includes('FORBIDDEN');
    return apiError(
      isForbidden ? 'FORBIDDEN' : 'INTERNAL_ERROR',
      err.message || 'Failed to move member',
      isForbidden ? 403 : 500
    );
  }
}
