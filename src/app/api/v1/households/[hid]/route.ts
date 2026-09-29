import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, getAgentBoothScope } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { hid } = params;
    if (!hid) {
      return apiError('VALIDATION_ERROR', 'Household ID or code is required', 400);
    }

    // Try finding by UUID first, then by code (e.g. H-001)
    let household = await prisma.household.findFirst({
      where: {
        OR: [
          { id: hid },
          { code: hid },
        ],
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            age: true,
            gender: true,
            epicNumber: true,
            roleInHousehold: true,
            relationshipType: true,
            guardianName: true,
          },
        },
        booth: {
          select: {
            id: true,
            boothNumber: true,
            name: true,
            ward: {
              select: {
                wardNumber: true,
                name: true,
              },
            },
          },
        },
        interactions: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
          include: {
            agent: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!household) {
      return apiError('NOT_FOUND', `Household '${hid}' not found in database`, 404);
    }

    // Check campaign access
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(household.campaignId)) {
        return apiError('FORBIDDEN', 'Access to this household record is denied', 403);
      }

      // Check agent booth scoping
      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, household.campaignId);
        if (allowedBooths !== null && household.boothId && !allowedBooths.includes(household.boothId)) {
          return apiError('FORBIDDEN', 'This household is outside your assigned booth scope', 403);
        }
      }
    }

    return apiSuccess(household);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve household', 500, String(err));
  }
}

// POST: Add new interaction/field note directly to this household
export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { hid } = params;
    const body = await req.json();
    const { status, notes, voterId } = body;

    let household = await prisma.household.findFirst({
      where: {
        OR: [{ id: hid }, { code: hid }],
      },
    });

    if (!household) {
      return apiError('NOT_FOUND', `Household '${hid}' not found`, 404);
    }

    // Check campaign access
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(household.campaignId)) {
        return apiError('FORBIDDEN', 'Access to interact with this household is denied', 403);
      }

      // Check agent booth scoping
      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, household.campaignId);
        if (allowedBooths !== null && household.boothId && !allowedBooths.includes(household.boothId)) {
          return apiError('FORBIDDEN', 'Cannot record field visit: household is outside your assigned booth scope', 403);
        }
      }
    }

    const interaction = await prisma.interaction.create({
      data: {
        campaignId: household.campaignId,
        householdId: household.id,
        agentId: principal.userId,
        voterId: voterId || null,
        status: status || 'VISITED',
        notes: notes || 'Field interaction recorded',
      },
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: household.campaignId },
      select: { organizationId: true },
    });

    if (campaign) {
      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: household.campaignId,
          actorId: principal.userId,
          action: 'FIELD_VISIT_RECORDED',
          resource: `Household:${household.id}`,
          details: JSON.stringify({
            householdCode: household.code,
            interactionId: interaction.id,
            status: interaction.status,
            agentName: interaction.agent?.displayName,
            boothId: household.boothId,
          }),
        },
      });
    }


    return apiSuccess(interaction, { message: 'Interaction recorded successfully' }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to record interaction', 500, String(err));
  }
}


// PATCH: Update household operational address, houseNumber, or primary contact
export async function PATCH(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { hid } = params;
    const body = await req.json();
    const { address, houseNumber, primaryContactName, primaryContactId, status } = body;

    let household = await prisma.household.findFirst({
      where: { OR: [{ id: hid }, { code: hid }] },
    });

    if (!household) {
      return apiError('NOT_FOUND', `Household '${hid}' not found`, 404);
    }

    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(household.campaignId)) {
        return apiError('FORBIDDEN', 'Access to update this household is denied', 403);
      }

      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, household.campaignId);
        if (allowedBooths !== null && household.boothId && !allowedBooths.includes(household.boothId)) {
          return apiError('FORBIDDEN', 'Cannot update household: outside your assigned booth scope', 403);
        }
      }
    }

    const updated = await prisma.household.update({
      where: { id: household.id },
      data: {
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(houseNumber !== undefined ? { houseNumber: String(houseNumber).trim() } : {}),
        ...(primaryContactName !== undefined ? { primaryContactName: String(primaryContactName).trim() } : {}),
        ...(primaryContactId !== undefined ? { primaryContactId } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        isManuallyCorrected: true,
        version: { increment: 1 },
      },
      include: {
        members: true,
        booth: { include: { ward: true } },
      },
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: household.campaignId },
      select: { organizationId: true },
    });

    if (campaign) {
      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: household.campaignId,
          actorId: principal.userId,
          action: 'HOUSEHOLD_ADDRESS_CORRECTED',
          resource: `Household:${household.id}`,
          details: JSON.stringify({
            householdCode: household.code,
            address: updated.address,
            primaryContact: updated.primaryContactName,
          }),
        },
      });
    }

    return apiSuccess(updated, { message: 'Household updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update household', 500, String(err));
  }
}
