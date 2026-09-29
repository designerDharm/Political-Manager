import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import { ReportsClient } from '@/components/campaign/ReportsClient';

export const revalidate = 0;

export default async function ReportsPage({ params }: { params: { id: string } }) {
  const [
    totalVoters,
    totalHouseholds,
    totalVisIssued,
    totalIssues,
    totalTurnoutSnapshots,
    totalExportsRecorded,
    wards,
    booths,
  ] = await Promise.all([
    prisma.voter.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.visEvent.count({ where: { campaignId: params.id, eventType: { in: ['ISSUED', 'REPRINTED'] } } }),
    prisma.issue.count({ where: { campaignId: params.id } }),
    prisma.turnoutSnapshot.count({ where: { campaignId: params.id } }),
    prisma.auditEvent.count({ where: { campaignId: params.id, action: 'REPORT_EXPORTED' } }),
    prisma.ward.findMany({
      where: { campaignId: params.id },
      select: { id: true, wardNumber: true, name: true },
      orderBy: { wardNumber: 'asc' },
    }),
    prisma.booth.findMany({
      where: { campaignId: params.id },
      select: { id: true, boothNumber: true, name: true, wardId: true },
      orderBy: { boothNumber: 'asc' },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Campaign Admin"
          userName="Rajesh Sharma"
          userRoleTitle="Campaign Admin"
          currentCampaignId={params.id}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Reports & Data Exports</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                Audit Export Center
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generate operational summaries, statutory booth registers, and audit export packages with privacy governance controls.
            </p>
          </div>

          <ReportsClient
            campaignId={params.id}
            initialCounts={{
              totalVoters,
              totalHouseholds,
              totalVisIssued,
              totalIssues,
              totalTurnoutSnapshots,
              totalExportsRecorded,
            }}
            wards={wards}
            booths={booths}
          />
        </main>
      </div>
    </div>
  );
}
