'use client';

import React, { useState } from 'react';
import {
  Users,
  Home,
  MapPin,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  Lightbulb,
  Filter
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { GovernedAiAssistant } from '@/components/analytics/GovernedAiAssistant';
import { CampaignOperationalMetrics } from '@/lib/analytics/metrics';

interface AnalyticsClientProps {
  campaignId: string;
  initialMetrics: CampaignOperationalMetrics;
  wards: Array<{ id: string; wardNumber: number; name: string }>;
  booths: Array<{
    id: string;
    boothNumber: number;
    name: string;
    wardId: string;
    totalElectors: number;
    householdsCount: number;
    votersCount: number;
    visitedCount: number;
  }>;
}

export function AnalyticsClient({
  campaignId,
  initialMetrics,
  wards,
  booths,
}: AnalyticsClientProps) {
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedBoothId, setSelectedBoothId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('ALL');

  // Filter booths and wards based on selection
  const filteredBooths = selectedWardId
    ? booths.filter((b) => b.wardId === selectedWardId)
    : booths;

  const targetBoothList = selectedBoothId
    ? filteredBooths.filter((b) => b.id === selectedBoothId)
    : filteredBooths;

  // Derive metrics dynamically according to filter
  const currentTotalVoters = selectedBoothId
    ? targetBoothList.reduce((acc, b) => acc + b.votersCount, 0)
    : selectedWardId
    ? initialMetrics.voters.wardDistribution.find((w) => w.wardId === selectedWardId)?.count || 0
    : initialMetrics.voters.total;

  const currentTotalHouseholds = selectedBoothId
    ? targetBoothList.reduce((acc, b) => acc + b.householdsCount, 0)
    : initialMetrics.households.total;

  const currentVisited = selectedBoothId
    ? targetBoothList.reduce((acc, b) => acc + b.visitedCount, 0)
    : initialMetrics.households.visited;

  const currentPending = Math.max(0, currentTotalHouseholds - currentVisited);
  const currentCoveragePct =
    currentTotalHouseholds > 0
      ? Math.min(100, Math.round((currentVisited / currentTotalHouseholds) * 100))
      : 0;

  // Derive key factual insight cards from actual PostgreSQL metrics
  const topWard = [...initialMetrics.voters.wardDistribution].sort((a, b) => b.count - a.count)[0];
  const maxIssuesCategory = Object.entries(initialMetrics.issues.categoryBreakdown).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed operational progress, coverage metrics, and logistics performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none"
          >
            <option value="ALL">All Active Operations</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>

          <select
            value={selectedWardId}
            onChange={(e) => {
              setSelectedWardId(e.target.value);
              setSelectedBoothId('');
            }}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none"
          >
            <option value="">All Wards ({wards.length})</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.wardNumber} - {w.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBoothId}
            onChange={(e) => setSelectedBoothId(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none"
          >
            <option value="">All Booths ({filteredBooths.length})</option>
            {filteredBooths.map((b) => (
              <option key={b.id} value={b.id}>
                Booth {b.boothNumber} - {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Voters"
          value={currentTotalVoters.toLocaleString()}
          subtitle="Registered electors"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Households"
          value={currentTotalHouseholds.toLocaleString()}
          subtitle="Mapped residences"
          icon={Home}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="Visited"
          value={currentVisited.toLocaleString()}
          subtitle={`${currentCoveragePct}% coverage`}
          icon={MapPin}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          badge={{ text: `${currentCoveragePct}%`, type: 'success' }}
        />
        <StatCard
          title="Pending"
          value={currentPending.toLocaleString()}
          subtitle="Awaiting door visit"
          icon={Clock}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-50"
        />
        <StatCard
          title="Issues"
          value={initialMetrics.issues.open.toLocaleString()}
          subtitle="Grievances reported"
          icon={AlertCircle}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-50"
          badge={{
            text: initialMetrics.issues.open > 0 ? `${initialMetrics.issues.open} Open` : 'Zero Open',
            type: initialMetrics.issues.open > 0 ? 'danger' : 'success',
          }}
        />
      </div>

      {/* Charts Grid: Ward Distribution & Booth Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward-wise Distribution Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ward Electors Distribution</h3>
              <p className="text-[11px] text-slate-500">Registered voter counts across campaign wards</p>
            </div>
            <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              {wards.length} {wards.length === 1 ? 'Ward Mapped' : 'Wards Mapped'}
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
            {initialMetrics.voters.wardDistribution.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                <span>No wards registered yet.</span>
              </div>
            ) : (
              initialMetrics.voters.wardDistribution.map((w) => {
                const maxVoters = Math.max(
                  ...initialMetrics.voters.wardDistribution.map((item) => item.count),
                  1
                );
                const heightPct = Math.round((w.count / maxVoters) * 100);

                return (
                  <div
                    key={w.wardId}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end max-w-[80px]"
                  >
                    <span className="text-[11px] font-bold text-slate-700">{w.count}</span>
                    <div
                      className="w-full rounded-t-md transition-all bg-blue-600"
                      style={{ height: `${Math.max(12, heightPct * 1.6)}px` }}
                    />
                    <span className="text-[11px] text-slate-600 font-semibold mt-1 truncate max-w-[70px] text-center">
                      {w.name}
                    </span>
                    <span className="text-[9px] text-slate-400">Ward #{w.wardNumber}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>Authoritative Ward Electors</span>
            <span>Single Source of Truth</span>
          </div>
        </div>

        {/* Booth Completion Progression */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Polling Booth Field Progress</h3>
              <p className="text-[11px] text-slate-500">Live polling booth door-to-door completion</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {currentVisited} Visited
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {currentPending} Pending
              </span>
            </div>
          </div>

          {targetBoothList.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs border-b border-slate-100">
              <PieChart className="w-8 h-8 text-slate-300 mb-2" />
              <span>No booths match the selected criteria.</span>
            </div>
          ) : (
            <div className="h-56 flex flex-col justify-start space-y-3 pt-2 border-b border-slate-100 overflow-y-auto pr-1">
              {targetBoothList.map((b) => {
                const pct =
                  b.householdsCount > 0
                    ? Math.min(100, Math.round((b.visitedCount / b.householdsCount) * 100))
                    : 0;

                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Booth #{b.boothNumber} - {b.name}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {b.votersCount} Electors • {b.visitedCount}/{b.householdsCount} HH ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>Live Field Sync</span>
            <span>Zero Falsified Data</span>
          </div>
        </div>
      </div>

      {/* Governed AI Assistant */}
      <GovernedAiAssistant campaignId={campaignId} />

      {/* Operational Key Insights - Factual Data Only */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Key Operational Facts</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
            Database Derived
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="font-bold text-emerald-800 text-xs block mb-1">Door Coverage</span>
            <p className="text-[11px] text-emerald-700">
              {currentVisited} out of {currentTotalHouseholds} mapped households ({currentCoveragePct}%) have recorded field visits.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="font-bold text-blue-800 text-xs block mb-1">Largest Electoral Ward</span>
            <p className="text-[11px] text-blue-700">
              {topWard ? `${topWard.name} with ${topWard.count} registered voters.` : 'No ward registered yet.'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="font-bold text-amber-800 text-xs block mb-1">Pending Field Work</span>
            <p className="text-[11px] text-amber-700">
              {currentPending} households currently pending door-to-door agent visit.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
            <span className="font-bold text-rose-800 text-xs block mb-1">Top Grievance Category</span>
            <p className="text-[11px] text-rose-700">
              {maxIssuesCategory
                ? `${maxIssuesCategory[0]} accounts for ${maxIssuesCategory[1]} logged issues.`
                : 'No open grievances logged.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
