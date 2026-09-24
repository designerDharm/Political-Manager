import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
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
    const body = await req.json();
    const { name, electionName, electionLevel, electionYear, candidateName, partyName, description, targetVoters } = body;

    if (!name) {
      return apiError('VALIDATION_ERROR', 'Campaign name is required', 400);
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return apiError('NOT_FOUND', 'No active organization found', 404);
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        name,
        electionName: electionName || 'General Assembly 2026',
        electionLevel: electionLevel || 'STATE_ASSEMBLY',
        electionYear: Number(electionYear) || 2026,
        candidateName,
        partyName,
        description,
        targetVoters: Number(targetVoters) || 0,
        status: 'ACTIVE',
      },
    });

    return apiSuccess(campaign, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create campaign', 500, String(err));
  }
}
