import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import { getCampaignOperationalMetrics } from '@/lib/analytics/metrics';
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient';

export const revalidate = 0;

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const [metrics, wards, rawBooths] = await Promise.all([
    getCampaignOperationalMetrics(params.id),
    prisma.ward.findMany({
      where: { campaignId: params.id },
      select: { id: true, wardNumber: true, name: true },
      orderBy: { wardNumber: 'asc' },
    }),
    prisma.booth.findMany({
      where: { campaignId: params.id },
      include: {
        _count: {
          select: {
            voters: true,
            households: true,
          },
        },
        households: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { boothNumber: 'asc' },
    }),
  ]);

  const boothVisitedMap = new Map<string, number>();
  for (const b of metrics.voters.boothDistribution) {
    boothVisitedMap.set(b.boothId, b.visitedHouseholds);
  }

  const booths = rawBooths.map((b) => {
    const visitedCount = boothVisitedMap.get(b.id) || 0;

    return {
      id: b.id,
      boothNumber: b.boothNumber,
      name: b.name,
      wardId: b.wardId,
      totalElectors: b.totalElectors || b._count.voters,
      householdsCount: b._count.households,
      votersCount: b._count.voters,
      visitedCount,
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={params.id} />

        <main className="flex-1 p-8 overflow-y-auto">
          <AnalyticsClient
            campaignId={params.id}
            initialMetrics={metrics}
            wards={wards}
            booths={booths}
          />
        </main>
      </div>
    </div>
  );
}
