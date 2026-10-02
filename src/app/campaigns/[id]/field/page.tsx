import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import { getCampaignOperationalMetrics } from '@/lib/analytics/metrics';
import { FieldOperationsClient } from '@/components/field/FieldOperationsClient';

export const revalidate = 0;

export default async function FieldOperationsPage({ params }: { params: { id: string } }) {
  const [households, rawBooths, tasks, metrics] = await Promise.all([
    prisma.household.findMany({
      where: { campaignId: params.id },
      take: 20,
      include: {
        booth: true,
        members: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.booth.findMany({
      where: { campaignId: params.id },
      include: {
        ward: true,
        _count: { select: { households: true, voters: true } },
      },
      orderBy: { boothNumber: 'asc' },
    }),
    prisma.assignment.findMany({
      where: { campaignId: params.id },
      include: {
        user: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    getCampaignOperationalMetrics(params.id),
  ]);

  const boothVisitedMap = new Map<string, number>();
  for (const b of metrics.voters.boothDistribution) {
    boothVisitedMap.set(b.boothId, b.visitedHouseholds);
  }

  const booths = rawBooths.map((b) => ({
    ...b,
    visitedCount: boothVisitedMap.get(b.id) || 0,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={params.id} />

        <FieldOperationsClient
          campaignId={params.id}
          initialTotalHouseholds={metrics.households.total}
          initialVerifiedCount={metrics.households.visited}
          initialBooths={booths}
          initialTasks={tasks}
        />
      </div>
    </div>
  );
}
