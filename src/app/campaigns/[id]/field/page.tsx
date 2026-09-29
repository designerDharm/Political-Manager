import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import { FieldOperationsClient } from '@/components/field/FieldOperationsClient';

export const revalidate = 0;

export default async function FieldOperationsPage({ params }: { params: { id: string } }) {
  const [households, booths, tasks, totalHouseholds, verifiedCount] = await Promise.all([
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
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id, status: 'Verified' } }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Campaign Admin"
          userName="Rajesh Sharma"
          userRoleTitle="Campaign Admin"
        />

        <FieldOperationsClient
          campaignId={params.id}
          initialTotalHouseholds={totalHouseholds}
          initialVerifiedCount={verifiedCount}
          initialBooths={booths}
          initialTasks={tasks}
        />
      </div>
    </div>
  );
}
