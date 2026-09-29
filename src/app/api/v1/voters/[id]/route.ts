import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, getAgentBoothScope } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { id } = params;
    const voter = await prisma.voter.findUnique({
      where: { id },
      include: {
        household: true,
        ward: true,
        booth: true,
        interactions: {
          orderBy: { occurredAt: 'desc' },
          include: { agent: true },
        },
      },
    });

    if (!voter) {
      return apiError('NOT_FOUND', 'Voter not found', 404);
    }

    // Check campaign access
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(voter.campaignId)) {
        return apiError('FORBIDDEN', 'Access to this voter record is denied', 403);
      }

      // Check agent booth scoping
      if (principal.platformRole === 'POLITICAL_AGENT') {
        const allowedBooths = await getAgentBoothScope(principal, voter.campaignId);
        if (allowedBooths !== null && voter.boothId && !allowedBooths.includes(voter.boothId)) {
          return apiError('FORBIDDEN', 'This voter is outside your assigned booth scope', 403);
        }
      }
    }

    return apiSuccess(voter);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve voter', 500, String(err));
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { id } = params;

    const existingVoter = await prisma.voter.findUnique({ where: { id } });
    if (!existingVoter) return apiError('NOT_FOUND', 'Voter not found', 404);

    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(existingVoter.campaignId)) {
        return apiError('FORBIDDEN', 'Access to update this voter is denied', 403);
      }
    }

    const body = await req.json();
    const { name, phone, age, gender, houseNumber, roleInHousehold, status, verificationStatus } = body;

    const voter = await prisma.voter.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(age !== undefined ? { age: Number(age) } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(houseNumber !== undefined ? { houseNumber } : {}),
        ...(roleInHousehold !== undefined ? { roleInHousehold } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(verificationStatus !== undefined ? { verificationStatus } : {}),
      },
    });

    return apiSuccess(voter, { message: 'Voter updated successfully' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to update voter', 500, String(err));
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { id } = params;

    const existingVoter = await prisma.voter.findUnique({ where: { id } });
    if (!existingVoter) return apiError('NOT_FOUND', 'Voter not found', 404);

    if (principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to delete voter records', 403);
    }

    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (!allowedCampaignIds.includes(existingVoter.campaignId)) {
        return apiError('FORBIDDEN', 'Access to delete this voter is denied', 403);
      }
    }

    await prisma.voter.delete({
      where: { id },
    });
    return apiSuccess({ id }, { message: 'Voter deleted successfully' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to delete voter', 500, String(err));
  }
}
