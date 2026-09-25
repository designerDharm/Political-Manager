import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { GovernedAiAssistant } from '@/components/analytics/GovernedAiAssistant';
import {
  Users,
  Home,
  MapPin,
  Clock,
  AlertCircle,
  BarChart3,
  TrendingUp,
  PieChart,
  Lightbulb,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const [voterCount, householdCount, visitedCount, issueCount, wards, booths] = await Promise.all([
    prisma.voter.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id, status: 'Verified' } }),
    prisma.issue.count({ where: { campaignId: params.id } }),
    prisma.ward.findMany({
      where: { campaignId: params.id },
      include: {
        _count: { select: { voters: true, booths: true } },
      },
      orderBy: { wardNumber: 'asc' },
    }),

    prisma.booth.findMany({
      where: { campaignId: params.id },
      include: {
        _count: { select: { voters: true, households: true } },
      },
      orderBy: { boothNumber: 'asc' },
    }),
  ]);

  const pendingCount = Math.max(0, householdCount - visitedCount);
  const coveragePercent = householdCount > 0 ? Math.round((visitedCount / householdCount) * 100) : 0;


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
          {/* Header & Date/Ward Pickers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Analytics</h1>
              <p className="text-xs text-slate-500 mt-1">
                Comprehensive insights on campaign progress, coverage, team performance and voter engagement.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm">
                <option>Active Period</option>
                <option>Last 30 Days</option>
              </select>
              <select className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm">
                <option>All Wards</option>
              </select>
            </div>
          </div>

          {/* 5 Metric Cards directly sourced from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Total Voters"
              value={voterCount.toLocaleString()}
              subtitle="Registered electors"
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Households"
              value={householdCount.toLocaleString()}
              subtitle="Mapped residences"
              icon={Home}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Visited"
              value={visitedCount.toLocaleString()}
              subtitle={`${coveragePercent}% coverage`}
              icon={MapPin}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: visitedCount > 0 ? `${coveragePercent}%` : '0%', type: 'success' }}
            />
            <StatCard
              title="Pending"
              value={pendingCount.toLocaleString()}
              subtitle="Awaiting door visit"
              icon={Clock}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
            />
            <StatCard
              title="Issues"
              value={issueCount.toLocaleString()}
              subtitle="Reported grievances"
              icon={AlertCircle}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
              badge={{ text: issueCount > 0 ? `${issueCount} Open` : '0 Open', type: issueCount > 0 ? 'danger' : 'success' }}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold mb-6">
            <button className="py-2.5 px-4 border-b-2 border-blue-600 text-blue-600">Coverage Overview</button>
            <button className="py-2.5 px-4 text-slate-500 hover:text-slate-800">Ward Wise</button>
            <button className="py-2.5 px-4 text-slate-500 hover:text-slate-800">Booth Wise</button>
            <button className="py-2.5 px-4 text-slate-500 hover:text-slate-800">Issues</button>
            <button className="py-2.5 px-4 text-slate-500 hover:text-slate-800">Team Performance</button>
          </div>

          {/* Chart Grid: Ward-wise Coverage Bars & Booth Completion Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* Ward-wise Coverage Bar Chart directly driven by database SSoT */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ward-wise Coverage</h3>
                  <p className="text-[11px] text-slate-500">Live voter coverage across campaign wards</p>
                </div>
                <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {wards.length} {wards.length === 1 ? 'Ward Mapped' : 'Wards Mapped'}
                </div>
              </div>

              {/* Bar visualization */}
              <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
                {wards.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No wards registered yet. Upload electoral roll to display coverage.</span>
                  </div>
                ) : (
                  wards.map((w) => {
                    const wardVoters = w._count?.voters || 0;
                    const pct = wardVoters > 0 ? Math.min(100, Math.round((visitedCount / wardVoters) * 100)) : 0;
                    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-600' : 'bg-amber-400';


                    return (
                      <div key={w.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end max-w-[80px]">
                        <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
                        <div
                          className={`w-full rounded-t-md transition-all ${color}`}
                          style={{ height: `${Math.max(12, pct * 1.8)}px` }}
                        />
                        <span className="text-[11px] text-slate-600 font-semibold mt-1 truncate max-w-[70px] text-center">
                          {w.name.replace(' - Central', '')}
                        </span>
                        <span className="text-[9px] text-slate-400">{wardVoters} voters</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Booth Completion Trend Chart Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Booth Completion Status</h3>
                  <p className="text-[11px] text-slate-500">Live polling booth door-to-door completion</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-blue-600 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-600" /> {visitedCount} Visited</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {visitedCount} Completed</span>
                  <span className="flex items-center gap-1 text-amber-600 font-semibold"><span className="w-2 h-2 rounded-full bg-amber-500" /> {pendingCount} Pending</span>
                </div>
              </div>

              {booths.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs border-b border-slate-100">
                  <PieChart className="w-8 h-8 text-slate-300 mb-2" />
                  <span>No booths mapped yet.</span>
                </div>
              ) : (
                <div className="h-56 flex flex-col justify-center space-y-4 pt-2 border-b border-slate-100">
                  {booths.map((b) => {
                    const bHouseholds = b._count?.households || 0;
                    const bVoters = b._count?.voters || 0;
                    const pct = bHouseholds > 0 ? Math.round((visitedCount / bHouseholds) * 100) : 0;

                    return (
                      <div key={b.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">Booth #{b.boothNumber} - {b.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{bVoters} Electors ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>Active Campaign SSoT</span>
                <span>Real-Time Database Sync</span>
              </div>
            </div>

          </div>


          {/* Governed AI Analytics Interface */}
          <GovernedAiAssistant campaignId={params.id} />

          {/* Key Insights AI Cards directly matching fa401604-1cfb-44f4-bc6a-d7936fb35e57.png */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Key Operational Insights</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
                AI Powered Data Engine
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <span className="font-bold text-emerald-800 text-xs block mb-1">Coverage Improving</span>
                <p className="text-[11px] text-emerald-700">Voter coverage increased by 15% compared to last month.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="font-bold text-blue-800 text-xs block mb-1">Top Performing Ward</span>
                <p className="text-[11px] text-blue-700">Ward 10 has achieved the highest household coverage at 95%.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="font-bold text-amber-800 text-xs block mb-1">Pending Work Alert</span>
                <p className="text-[11px] text-amber-700">530 voters pending visit. Focus on Ward 4 and Ward 9.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="font-bold text-rose-800 text-xs block mb-1">Major Issue Resolved</span>
                <p className="text-[11px] text-rose-700">Water supply issues account for 26% of all raised operational issues.</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
