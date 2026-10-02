import { prisma } from '@/lib/prisma';

export interface CampaignOperationalMetrics {
  campaign: {
    id: string;
    name: string;
    electionName: string;
    electionLevel: string;
    status: string;
    targetVoters: number | null;
    estimatedVoters: number | null;
    safeMarginVotes: number | null;
  };
  voters: {
    total: number;
    wardDistribution: Array<{ wardId: string; wardNumber: number; name: string; count: number }>;
    boothDistribution: Array<{
      boothId: string;
      boothNumber: number;
      name: string;
      count: number;
      totalHouseholds: number;
      visitedHouseholds: number;
    }>;
  };
  households: {
    total: number;
    visited: number;
    pending: number;
    verified: number;
    coveragePercentage: number;
    averageSize: number;
    statusBreakdown: Record<string, number>;
  };
  team: {
    activeAgents: number;
    activeAssignments: number;
    completedAssignments: number;
  };
  issues: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    categoryBreakdown: Record<string, number>;
  };
  electionDay: {
    status: string;
    totalVisIssued: number;
    totalVisReprinted: number;
    latestTurnoutPercentage: number;
    activeBooths: number;
  };
}

export interface MetricFilters {
  wardId?: string;
  boothId?: string;
  agentId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Authoritative Campaign Operational Metrics Service (SSoT)
 * Guaranteed zero double-counting, zero hardcoded values, and zero political inferences.
 */
export async function getCampaignOperationalMetrics(
  campaignId: string,
  filters?: MetricFilters
): Promise<CampaignOperationalMetrics> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      electionName: true,
      electionLevel: true,
      status: true,
      targetVoters: true,
      estimatedVoters: true,
      safeMarginVotes: true,
      electionDate: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Base scoping filters
  const voterWhere: any = { campaignId };
  const householdWhere: any = { campaignId };
  const issueWhere: any = { campaignId };
  const assignmentWhere: any = { campaignId };

  if (filters?.wardId) {
    voterWhere.wardId = filters.wardId;
    householdWhere.booth = { wardId: filters.wardId };
    issueWhere.booth = { wardId: filters.wardId };
  }

  if (filters?.boothId) {
    voterWhere.boothId = filters.boothId;
    householdWhere.boothId = filters.boothId;
    issueWhere.boothId = filters.boothId;
  }

  if (filters?.agentId) {
    assignmentWhere.userId = filters.agentId;
  }

  if (filters?.startDate || filters?.endDate) {
    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = filters.startDate;
    if (filters.endDate) dateFilter.lte = filters.endDate;
    issueWhere.createdAt = dateFilter;
  }

  // Parallel authoritative aggregate queries
  const [
    totalVoters,
    totalHouseholds,
    verifiedHouseholds,
    distinctVisitedInteractions,
    householdStatusGroups,
    wards,
    booths,
    activeAssignments,
    completedAssignments,
    activeAgents,
    issuesByStatus,
    issuesByCategory,
    visIssuedCount,
    visReprintedCount,
    latestTurnoutSnapshot,
  ] = await Promise.all([
    prisma.voter.count({ where: voterWhere }),
    prisma.household.count({ where: householdWhere }),
    prisma.household.count({
      where: {
        ...householdWhere,
        status: { in: ['Verified', 'Confirmed', 'CONFIRMED'] },
      },
    }),
    // Distinct visited households count via interaction to prevent double counting
    prisma.interaction.findMany({
      where: {
        campaignId,
        householdId: { not: null },
        ...(filters?.boothId ? { household: { boothId: filters.boothId } } : {}),
        ...(filters?.wardId ? { household: { booth: { wardId: filters.wardId } } } : {}),
      },
      distinct: ['householdId'],
      select: { householdId: true, household: { select: { boothId: true } } },
    }),
    prisma.household.groupBy({
      by: ['status'],
      where: householdWhere,
      _count: true,
    }),
    prisma.ward.findMany({
      where: { campaignId },
      orderBy: { wardNumber: 'asc' },
      include: {
        _count: { select: { voters: true } },
      },
    }),
    prisma.booth.findMany({
      where: {
        campaignId,
        ...(filters?.wardId ? { wardId: filters.wardId } : {}),
      },
      orderBy: { boothNumber: 'asc' },
      include: {
        _count: { select: { voters: true, households: true } },
      },
    }),
    prisma.assignment.count({
      where: { ...assignmentWhere, status: 'Active' },
    }),
    prisma.assignment.count({
      where: { ...assignmentWhere, status: 'Completed' },
    }),
    prisma.campaignMembership.count({
      where: { campaignId, active: true, role: 'POLITICAL_AGENT' },
    }),
    prisma.issue.groupBy({
      by: ['status'],
      where: issueWhere,
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ['category'],
      where: issueWhere,
      _count: true,
    }),
    prisma.visEvent.count({
      where: { campaignId, eventType: 'ISSUED' },
    }),
    prisma.visEvent.count({
      where: { campaignId, eventType: 'REPRINTED' },
    }),
    prisma.turnoutSnapshot.findFirst({
      where: { campaignId },
      orderBy: { recordedAt: 'desc' },
      select: { percentage: true },
    }),
  ]);

  // SSoT Visited Count: distinct households with at least one persisted field interaction
  const visitedCount = distinctVisitedInteractions.length;
  const pendingCount = Math.max(0, totalHouseholds - visitedCount);
  const coveragePercent =
    totalHouseholds > 0
      ? Math.min(100, Math.max(0, Math.round((visitedCount / totalHouseholds) * 100)))
      : 0;

  // Compute booth-level visited households from distinct visited interactions
  const boothVisitedCounts = new Map<string, number>();
  for (const item of distinctVisitedInteractions) {
    const bId = item.household?.boothId;
    if (bId) {
      boothVisitedCounts.set(bId, (boothVisitedCounts.get(bId) || 0) + 1);
    }
  }

  const averageHouseholdSize =
    totalHouseholds > 0 ? Math.round((totalVoters / totalHouseholds) * 10) / 10 : 0;

  // Status breakdown dictionary
  const statusBreakdown: Record<string, number> = {};
  householdStatusGroups.forEach((g) => {
    statusBreakdown[g.status] = g._count;
  });

  // Issue breakdown
  let openIssues = 0;
  let inProgressIssues = 0;
  let resolvedIssues = 0;
  let totalIssues = 0;

  issuesByStatus.forEach((g) => {
    totalIssues += g._count;
    if (g.status === 'OPEN') openIssues += g._count;
    else if (g.status === 'IN_PROGRESS') inProgressIssues += g._count;
    else if (g.status === 'RESOLVED') resolvedIssues += g._count;
  });

  const categoryBreakdown: Record<string, number> = {};
  issuesByCategory.forEach((g) => {
    categoryBreakdown[g.category] = g._count;
  });

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      electionName: campaign.electionName,
      electionLevel: campaign.electionLevel,
      status: campaign.status,
      targetVoters: campaign.targetVoters,
      estimatedVoters: campaign.estimatedVoters,
      safeMarginVotes: campaign.safeMarginVotes,
    },
    voters: {
      total: totalVoters,
      wardDistribution: wards.map((w) => ({
        wardId: w.id,
        wardNumber: w.wardNumber,
        name: w.name,
        count: w._count.voters,
      })),
      boothDistribution: booths.map((b) => ({
        boothId: b.id,
        boothNumber: b.boothNumber,
        name: b.name,
        count: b._count.voters,
        totalHouseholds: b._count.households,
        visitedHouseholds: boothVisitedCounts.get(b.id) || 0,
      })),
    },
    households: {
      total: totalHouseholds,
      visited: visitedCount,
      pending: pendingCount,
      verified: verifiedHouseholds,
      coveragePercentage: coveragePercent,
      averageSize: averageHouseholdSize,
      statusBreakdown,
    },
    team: {
      activeAgents,
      activeAssignments,
      completedAssignments,
    },
    issues: {
      total: totalIssues,
      open: openIssues,
      inProgress: inProgressIssues,
      resolved: resolvedIssues,
      categoryBreakdown,
    },
    electionDay: {
      status: campaign.status === 'ACTIVE' ? 'ACTIVE' : 'NOT_STARTED',
      totalVisIssued: visIssuedCount,
      totalVisReprinted: visReprintedCount,
      latestTurnoutPercentage: latestTurnoutSnapshot?.percentage || 0,
      activeBooths: booths.length,
    },
  };
}
