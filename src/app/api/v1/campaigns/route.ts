import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;

    // SUPER_ADMIN sees all campaigns; others see only campaigns where they have active membership
    const where: any = {};
    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      where.id = { in: allowedCampaignIds };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        election: true,
        wards: { select: { id: true, wardNumber: true, name: true } },
        booths: { select: { id: true, boothNumber: true, name: true, totalElectors: true } },
        _count: {
          select: {
            voters: true,
            households: true,
            issues: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(campaigns);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaigns', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    // Ground workers (Political Agents) cannot create campaigns
    if (principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to create campaigns', 403);
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
      isIndependent,
    } = body;

    if (!name || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Campaign name is required', 400);
    }

    // Validation of non-negative numeric parameters
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

    const org = await prisma.organization.findFirst();
    if (!org) {
      return apiError('NOT_FOUND', 'No active organization found', 404);
    }

    const effectivePartyName = isIndependent ? 'Independent Candidate' : (partyName ? partyName.trim() : 'Independent Candidate');

    // Run creation in transaction: create campaign and attach creator membership
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          electionName: electionName ? electionName.trim() : `${constituencyName || name.trim()} Election ${electionYear || 2026}`,
          electionLevel: electionLevel || 'STATE_ASSEMBLY',
          electionYear: Number(electionYear) || 2026,
          electionDate: electionDate ? new Date(electionDate) : null,
          candidateName: candidateName ? candidateName.trim() : null,
          partyName: effectivePartyName,
          candidatePhoto: candidatePhoto || null,
          description: description ? description.trim() : null,
          status: status || 'SETUP',
          targetVoters: Number(targetVoters) || 0,
          targetCoverage: Number(targetCoverage) || 80,
          estimatedVoters: Number(estimatedVoters) || Number(targetVoters) || 0,
          targetVotes: Number(targetVotes) || 0,
          safeMarginVotes: Number(safeMarginVotes) || 0,
          constituencyName: constituencyName ? constituencyName.trim() : null,
          stateName: stateName ? stateName.trim() : null,
          districtName: districtName ? districtName.trim() : null,
          declaredWards: Number(declaredWards) || 0,
          declaredBooths: Number(declaredBooths) || 0,
          declaredVillages: Number(declaredVillages) || 0,
          candidateCount: Math.max(1, Number(candidateCount) || 1),
        },
      });

      // Automatically give the creator CAMPAIGN_ADMIN membership so they have immediate RBAC access
      await tx.campaignMembership.create({
        data: {
          campaignId: campaign.id,
          userId: principal.userId,
          role: principal.platformRole === 'SUPER_ADMIN' ? 'CAMPAIGN_ADMIN' : principal.platformRole,
          scopeType: 'ALL',
          scopeIds: '[]',
          active: true,
        },
      });

      // If normalized candidate name is provided, create/link candidate
      if (candidateName && candidateName.trim()) {
        let party = null;
        if (!isIndependent && partyName) {
          party = await tx.party.findFirst({
            where: { name: partyName.trim() },
          });
        }

        const candidate = await tx.candidate.create({
          data: {
            organizationId: org.id,
            partyId: party?.id || null,
            fullName: candidateName.trim(),
          },
        });

        await tx.campaignCandidate.create({
          data: {
            campaignId: campaign.id,
            candidateId: candidate.id,
            isPrimary: true,
          },
        });
      }

      // Record audit event
      // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
      await tx.auditEvent.create({
        data: {
          organizationId: org.id,
          action: 'CREATE_CAMPAIGN',
          resource: `campaign:${campaign.id}`,
          details: JSON.stringify({
            createdBy: principal.userId,
            name: campaign.name,
            electionLevel: campaign.electionLevel,
            status: campaign.status,
          }),
        },
      });

      return campaign;
    });

    return apiSuccess(result, { created: true }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to create campaign', 500, String(err));
  }
}
