import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';
import { logAuditEvent } from '@/lib/api/audit';

// GET /api/v1/campaigns/[id] - Fetch full campaign setup & geography details
export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        election: true,
        wards: {
          orderBy: { wardNumber: 'asc' },
          include: {
            booths: {
              orderBy: { boothNumber: 'asc' },
            },
          },
        },
        booths: {
          orderBy: { boothNumber: 'asc' },
        },
        candidates: {
          include: {
            candidate: {
              include: {
                party: true,
              },
            },
          },
        },
        _count: {
          select: {
            wards: true,
            booths: true,
            voters: true,
            households: true,
            issues: true,
          },
        },
      },
    });

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    return apiSuccess(campaign);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaign details', 500, String(err));
  }
}

// PATCH /api/v1/campaigns/[id] - Update campaign setup, planning, or status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    // Only SUPER_ADMIN or CAMPAIGN_ADMIN can update campaign setup
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to edit campaign setup', 403);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            wards: true,
            booths: true,
            voters: true,
            households: true,
          },
        },
      },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    const body = await req.json();
    const {
      name,
      electionName,
      electionLevel,
      electionYear,
      electionDate,
      candidateName,
      partyName,
      candidatePhoto,
      description,
      status,
      targetVoters,
      targetCoverage,
      estimatedVoters,
      targetVotes,
      safeMarginVotes,
      constituencyName,
      stateName,
      districtName,
      declaredWards,
      declaredBooths,
      declaredVillages,
      candidateCount,
    } = body;

    // Validate status transition if requested
    if (status && status === 'ACTIVE') {
      // Activation precheck: ensure required setup criteria are met
      if (!name && !existing.name) {
        return apiError('VALIDATION_ERROR', 'Campaign name is required for activation', 400);
      }
      if (!constituencyName && !existing.constituencyName && !existing.electionName) {
        return apiError('VALIDATION_ERROR', 'Constituency / Area is required for activation', 400);
      }
      if (existing._count.booths === 0 && (!declaredBooths || declaredBooths <= 0)) {
        return apiError('VALIDATION_ERROR', 'At least one polling booth must be configured before activating campaign', 400);
      }
    }

    // Validation for non-negative numerical fields
    if (estimatedVoters !== undefined && Number(estimatedVoters) < 0) {
      return apiError('VALIDATION_ERROR', 'Estimated voters cannot be negative', 400);
    }
    if (targetVotes !== undefined && Number(targetVotes) < 0) {
      return apiError('VALIDATION_ERROR', 'Target votes cannot be negative', 400);
    }
    if (safeMarginVotes !== undefined && Number(safeMarginVotes) < 0) {
      return apiError('VALIDATION_ERROR', 'Safe margin votes cannot be negative', 400);
    }
    if (declaredWards !== undefined && Number(declaredWards) < 0) {
      return apiError('VALIDATION_ERROR', 'Declared wards cannot be negative', 400);
    }
    if (declaredBooths !== undefined && Number(declaredBooths) < 0) {
      return apiError('VALIDATION_ERROR', 'Declared booths cannot be negative', 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (electionName !== undefined) updateData.electionName = electionName.trim();
    if (electionLevel !== undefined) updateData.electionLevel = electionLevel;
    if (electionYear !== undefined) updateData.electionYear = Number(electionYear);
    if (electionDate !== undefined) updateData.electionDate = electionDate ? new Date(electionDate) : null;
    if (candidateName !== undefined) updateData.candidateName = candidateName ? candidateName.trim() : null;
    if (partyName !== undefined) updateData.partyName = partyName ? partyName.trim() : null;
    if (candidatePhoto !== undefined) updateData.candidatePhoto = candidatePhoto;
    if (description !== undefined) {
      const cleanDesc = description ? description.trim() : '';
      if (existing.description && existing.description.includes('ELECTION_DAY_STATE:')) {
        const marker = 'ELECTION_DAY_STATE:';
        const stateStr = existing.description.substring(existing.description.indexOf(marker));
        updateData.description = cleanDesc ? `${cleanDesc}\n${stateStr}` : stateStr;
      } else {
        updateData.description = cleanDesc || null;
      }
    }
    if (status !== undefined) updateData.status = status;
    if (targetVoters !== undefined) updateData.targetVoters = Number(targetVoters);
    if (targetCoverage !== undefined) updateData.targetCoverage = Number(targetCoverage);
    if (estimatedVoters !== undefined) updateData.estimatedVoters = Number(estimatedVoters);
    if (targetVotes !== undefined) updateData.targetVotes = Number(targetVotes);
    if (safeMarginVotes !== undefined) updateData.safeMarginVotes = Number(safeMarginVotes);
    if (constituencyName !== undefined) updateData.constituencyName = constituencyName ? constituencyName.trim() : null;
    if (stateName !== undefined) updateData.stateName = stateName ? stateName.trim() : null;
    if (districtName !== undefined) updateData.districtName = districtName ? districtName.trim() : null;
    if (declaredWards !== undefined) updateData.declaredWards = Number(declaredWards);
    if (declaredBooths !== undefined) updateData.declaredBooths = Number(declaredBooths);
    if (declaredVillages !== undefined) updateData.declaredVillages = Number(declaredVillages);
    if (candidateCount !== undefined) updateData.candidateCount = Math.max(1, Number(candidateCount));

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Record audit event for campaign update
    await logAuditEvent({
      organizationId: updated.organizationId,
      action: 'UPDATE_CAMPAIGN_SETUP',
      resource: `campaign:${campaignId}`,
      details: JSON.stringify({
        updatedBy: authResult.principal.userId,
        fields: Object.keys(updateData),
        status: updated.status,
      }),
    });

    return apiSuccess(updated, { message: 'Campaign setup updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update campaign setup', 500, String(err));
  }
}
