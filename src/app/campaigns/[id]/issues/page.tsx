import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { AlertCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { IssueManagementClient } from '@/components/campaign/IssueManagementClient';

export const revalidate = 0;

export default async function IssueManagementPage({ params }: { params: { id: string } }) {
  const [issues, users, booths, households] = await Promise.all([
    prisma.issue.findMany({
      where: { campaignId: params.id },
      include: {
        household: { select: { id: true, code: true, address: true } },
        booth: { select: { id: true, boothNumber: true, name: true } },
        assignee: { select: { id: true, displayName: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, displayName: true, role: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.booth.findMany({
      where: { campaignId: params.id },
      select: { id: true, boothNumber: true, name: true },
      orderBy: { boothNumber: 'asc' },
    }),
    prisma.household.findMany({
      where: { campaignId: params.id },
      select: { id: true, code: true, address: true },
      take: 50,
      orderBy: { code: 'asc' },
    }),
  ]);

  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const resolvedIssues = issues.filter((i) => i.status === 'RESOLVED').length;
  const highPriority = issues.filter((i) => i.priority === 'HIGH' || i.priority === 'CRITICAL').length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Campaign Admin"
          userName="Rajesh Sharma"
          userRoleTitle="Campaign Admin"
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* 4 Metric Cards directly sourced from database */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Issues"
              value={totalIssues.toLocaleString()}
              subtitle="All reported issues"
              icon={AlertCircle}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Open Issues"
              value={openIssues.toLocaleString()}
              subtitle="Require attention"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              badge={{ text: openIssues > 0 ? 'Pending' : 'All Clear', type: openIssues > 0 ? 'warning' : 'success' }}
            />
            <StatCard
              title="Resolved Issues"
              value={resolvedIssues.toLocaleString()}
              subtitle="Successfully closed"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Resolved', type: 'success' }}
            />
            <StatCard
              title="High Priority"
              value={highPriority.toLocaleString()}
              subtitle="Critical issues"
              icon={AlertTriangle}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
              badge={{ text: highPriority > 0 ? 'Critical' : 'None', type: highPriority > 0 ? 'danger' : 'success' }}
            />
          </div>

          {/* Interactive Client Component for Issues & Details */}
          <IssueManagementClient
            campaignId={params.id}
            initialIssues={issues.map((i) => ({
              ...i,
              createdAt: i.createdAt.toISOString(),
              notes: i.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
            }))}
            users={users}
            booths={booths}
            households={households}
          />
        </main>
      </div>
    </div>
  );
}
