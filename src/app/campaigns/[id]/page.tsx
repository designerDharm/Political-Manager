import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { getCampaignOperationalMetrics } from '@/lib/analytics/metrics';
import Link from 'next/link';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  UsersRound,
  FileSpreadsheet,
  CalendarCheck,
  Settings,
  TrendingUp,
  Target
} from 'lucide-react';

export const revalidate = 0;

export default async function CampaignAdminDashboard({
  params,
}: {
  params: { id: string };
}) {
  const [metrics, campaign] = await Promise.all([
    getCampaignOperationalMetrics(params.id),
    prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        election: true,
        wards: true,
      },
    }),
  ]);

  const totalVoters = metrics.voters.total;
  const totalHouseholds = metrics.households.total;
  const visitedHouseholds = metrics.households.visited;
  const pendingVisits = metrics.households.pending;
  const openIssues = metrics.issues.open;
  const coveragePercent = metrics.households.coveragePercentage;

  // Distinguish Configured Planning Targets vs Observed Operational Data
  const targetVotersPlanning = campaign?.targetVoters || null;
  const targetHouseholdsPlanning = targetVotersPlanning ? Math.round(targetVotersPlanning / 3) : totalHouseholds;
  const planningProgressPercent =
    targetHouseholdsPlanning > 0
      ? Math.min(100, Math.round((visitedHouseholds / targetHouseholdsPlanning) * 100))
      : coveragePercent;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={params.id} />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header Banner & Election Switcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <span className={`w-2 h-2 rounded-full ${campaign ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
                {campaign?.status || 'No Active Campaign'}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {campaign?.name || 'No Campaign Configured'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {campaign ? `${campaign.electionName} • ${campaign.electionLevel}` : 'Create a campaign or import electoral roll data to begin.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/campaigns/${params.id}/reports`}
                className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Reports</span>
              </Link>
              <Link
                href={`/campaigns/${params.id}/voters/upload`}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                Upload Voter List
              </Link>
              <Link
                href={`/campaigns/${params.id}/election-day`}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
              >
                Election Day Mode
              </Link>
            </div>
          </div>

          {/* Campaign Household Progress */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Observed Household Coverage</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    PostgreSQL SSoT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {coveragePercent}% of mapped households visited ({visitedHouseholds.toLocaleString()} of {totalHouseholds.toLocaleString()} mapped residences)
                </p>
              </div>
              <span className="text-2xl font-black text-blue-600">{coveragePercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>

            {targetVotersPlanning && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  Configured Planning Target: {targetVotersPlanning.toLocaleString()} Voters (~{targetHouseholdsPlanning.toLocaleString()} households)
                </span>
                <span className="font-semibold text-slate-700">
                  Target Fulfillment: {planningProgressPercent}%
                </span>
              </div>
            )}
          </div>

          {/* 4 Stat Cards directly sourced from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Registered Voters"
              value={totalVoters.toLocaleString()}
              subtitle="Imported & published electors"
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Households Visited"
              value={visitedHouseholds.toLocaleString()}
              subtitle={`${coveragePercent}% of total residences`}
              icon={CheckCircle}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: visitedHouseholds > 0 ? 'Active' : 'Not Started', type: visitedHouseholds > 0 ? 'success' : 'info' }}
            />
            <StatCard
              title="Pending Door Visits"
              value={pendingVisits.toLocaleString()}
              subtitle="Awaiting agent follow-up"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Open Field Grievances"
              value={openIssues.toLocaleString()}
              subtitle="Civic & infrastructure issues"
              icon={AlertTriangle}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
              badge={{ text: openIssues > 0 ? 'Action Req' : 'Zero Issues', type: openIssues > 0 ? 'danger' : 'success' }}
            />
          </div>

          {/* Quick Operations Grid */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Quick Operations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Voters List', href: `/campaigns/${params.id}/voters`, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'Coverage Map', href: `/campaigns/${params.id}/map`, icon: MapPin, color: 'text-rose-600 bg-rose-50' },
                { label: 'Team', href: `/campaigns/${params.id}/team`, icon: UsersRound, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Analytics', href: `/campaigns/${params.id}/analytics`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
                { label: 'Reports', href: `/campaigns/${params.id}/reports`, icon: FileSpreadsheet, color: 'text-amber-600 bg-amber-50' },
                { label: 'Settings', href: `/campaigns/${params.id}/settings`, icon: Settings, color: 'text-slate-600 bg-slate-100' },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col items-center text-center group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition group-hover:scale-110 ${item.color}`}>
                      <ItemIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
