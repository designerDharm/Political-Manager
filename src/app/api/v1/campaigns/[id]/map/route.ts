import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';

// GET /api/v1/campaigns/[id]/map - GeoJSON FeatureCollection of booths & operational statistics
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const where: any = { campaignId };

    // Strict Agent Scoping
    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(authResult.principal, campaignId);
      if (allowedBooths !== null) {
        where.id = { in: allowedBooths };
      }
    }

    // Optional Ward filter
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('wardId');
    if (wardId) {
      where.wardId = wardId;
    }

    // Query booths with related counts
    const booths = await prisma.booth.findMany({
      where,
      orderBy: { boothNumber: 'asc' },
      include: {
        ward: {
          select: {
            id: true,
            wardNumber: true,
            name: true,
            localityType: true,
          },
        },
        _count: {
          select: {
            voters: true,
            households: true,
            issues: true,
          },
        },
      },
    });

    // Query active assignments in this campaign to map agents to booths
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        campaignId,
        status: 'Active',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Compute verified households per booth for accurate coverage
    const verifiedCounts = await prisma.household.groupBy({
      by: ['boothId'],
      where: {
        campaignId,
        boothId: { in: booths.map((b) => b.id) },
        status: 'Verified',
      },
      _count: { id: true },
    });

    const verifiedMap = new Map<string, number>();
    for (const v of verifiedCounts) {
      if (v.boothId) {
        verifiedMap.set(v.boothId, v._count.id);
      }
    }

    // Transform into GeoJSON Features + unmapped lists
    const features: any[] = [];
    const unmappedBooths: any[] = [];

    let totalHouseholdsAcrossBooths = 0;
    let totalVerifiedAcrossBooths = 0;
    let totalIssuesAcrossBooths = 0;

    for (const booth of booths) {
      const totalH = booth._count.households;
      const verifiedH = verifiedMap.get(booth.id) || 0;
      const totalVoters = booth._count.voters;
      const totalIssues = booth._count.issues;
      const coveragePct = totalH > 0 ? Math.round((verifiedH / totalH) * 100) : 0;

      totalHouseholdsAcrossBooths += totalH;
      totalVerifiedAcrossBooths += verifiedH;
      totalIssuesAcrossBooths += totalIssues;

      // Status indicator based on verified coverage
      let coverageStatus = 'Not Visited';
      if (coveragePct === 100 && totalH > 0) {
        coverageStatus = 'Completed';
      } else if (coveragePct >= 50) {
        coverageStatus = 'Good';
      } else if (coveragePct > 0) {
        coverageStatus = 'Partial';
      }

      const assignedAgents = activeAssignments
        .filter((a) => {
          if (a.scopeType === 'BOOTH') {
            return (
              a.scopeTarget === booth.id ||
              a.scopeTarget === `Booth ${booth.boothNumber}` ||
              a.scopeTarget.includes(`Booth ${booth.boothNumber}`) ||
              a.scopeTarget.includes(booth.name)
            );
          }
          if (a.scopeType === 'WARD') {
            return (
              a.scopeTarget === booth.wardId ||
              a.scopeTarget === `Ward ${booth.ward.wardNumber}` ||
              a.scopeTarget.includes(`Ward ${booth.ward.wardNumber}`)
            );
          }
          return a.scopeType === 'ALL';
        })
        .map((a) => ({
          id: a.user.id,
          name: a.user.displayName,
          email: a.user.email,
        }));

      const properties = {
        id: booth.id,
        campaignId: booth.campaignId,
        wardId: booth.wardId,
        wardNumber: booth.ward.wardNumber,
        wardName: booth.ward.name,
        boothNumber: booth.boothNumber,
        name: booth.name,
        areaLocality: booth.areaLocality,
        pollingStation: booth.pollingStation,
        totalElectors: booth.totalElectors,
        votersCount: totalVoters,
        householdsCount: totalH,
        verifiedHouseholdsCount: verifiedH,
        coveragePct,
        coverageStatus,
        issuesCount: totalIssues,
        assignedAgents,
        hasLocation: booth.latitude !== null && booth.longitude !== null,
      };

      if (booth.latitude !== null && booth.longitude !== null) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [booth.longitude, booth.latitude],
          },
          properties,
        });
      } else {
        unmappedBooths.push({
          ...properties,
          statusNote: 'LOCATION_NOT_SET',
        });
      }
    }

    const overallCoveragePct =
      totalHouseholdsAcrossBooths > 0
        ? Math.round((totalVerifiedAcrossBooths / totalHouseholdsAcrossBooths) * 100)
        : 0;

    return apiSuccess({
      type: 'FeatureCollection',
      features,
      summary: {
        totalBooths: booths.length,
        mappedBoothsCount: features.length,
        unmappedBoothsCount: unmappedBooths.length,
        totalHouseholds: totalHouseholdsAcrossBooths,
        verifiedHouseholds: totalVerifiedAcrossBooths,
        coveragePct: overallCoveragePct,
        totalIssues: totalIssuesAcrossBooths,
      },
      unmappedBooths,
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaign geography map', 500, String(err));
  }
}
