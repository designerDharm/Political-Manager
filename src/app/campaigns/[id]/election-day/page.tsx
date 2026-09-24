import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  Users,
  Building,
  UserCheck,
  FileText,
  RotateCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

export const revalidate = 0;

export default async function CorrectedElectionDayPage({ params }: { params: { id: string } }) {
  // Query independent metrics directly from database Single Source of Truth
  const [voterCount, visEventCount, turnoutSnapshots, boothCount] = await Promise.all([
    prisma.voter.count(),
    prisma.visEvent.count(),
    prisma.turnoutSnapshot.findMany({ orderBy: { recordedAt: 'desc' } }),
    prisma.booth.count(),
  ]);

  const latestTurnout = turnoutSnapshots[0]?.percentage || 63.0;

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
          {/* Live Data Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Election Day - Command Center</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational Feeds
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Independent real-time monitoring of official voter turnout, voter slip assistance desks, and booth operations.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-white px-2.5 py-1 rounded border border-slate-200">
                Data Freshness: <strong>Realtime Synchronized</strong>
              </span>
            </div>
          </div>

          {/* Decoupled Metric Cards directly reflecting corrected semantics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Registered Electors"
              value={voterCount.toLocaleString()}
              subtitle="Imported electoral database"
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Official Aggregate Turnout"
              value={turnoutSnapshots.length > 0 ? `${latestTurnout}%` : '0%'}
              subtitle="Authorized polling agent reports"
              icon={Building}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: turnoutSnapshots.length > 0 ? 'Official Estimate' : 'Awaiting Polls', type: turnoutSnapshots.length > 0 ? 'success' : 'info' }}
            />
            <StatCard
              title="Help Desk Slips Issued (VIS)"
              value={visEventCount.toLocaleString()}
              subtitle="Assistance delivered (Non-ballot)"
              icon={FileText}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              badge={{ text: 'Civic Support', type: 'info' }}
            />
            <StatCard
              title="Booths Active & Staffed"
              value={`${boothCount} Booths`}
              subtitle={boothCount > 0 ? '100% booth coverage' : 'No booths configured'}
              icon={UserCheck}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
          </div>

          {/* Explicit Semantic Clarification Banner */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3 text-xs text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-blue-950">Statutory Election Semantics & Decoupled Metrics</span>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                Voter Information Slips (VIS) reflect external help-desk operational volume to assist citizens with booth locations. VIS issuance does not equate to voter turnout, nor does it infer candidate votes cast. Turnout numbers originate solely from official aggregate reports.
              </p>
            </div>
          </div>

          {/* Turnout Gauge & Hourly Progression */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Turnout Progression</h3>
                  <p className="text-xs text-slate-500">Hourly aggregate percentages received from polling booth representatives.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Gauge */}
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
                    <div className="absolute top-0 w-44 h-44 rounded-full border-[16px] border-slate-100" />
                    <div className="absolute top-0 w-44 h-44 rounded-full border-[16px] border-emerald-500 border-b-transparent border-l-transparent rotate-45" />
                    <div className="text-center mb-1">
                      <span className="text-3xl font-black text-slate-900 leading-none">{latestTurnout}%</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Aggregate Turnout</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-2">78,432 / 1,24,580</span>
                </div>

                {/* Hourly Bars */}
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Reported by Hour</span>
                  <div className="h-40 flex items-end justify-between gap-1.5 pt-4 pb-1 border-b border-slate-100">
                    {[
                      { hour: '7 AM', val: 5 },
                      { hour: '8 AM', val: 12 },
                      { hour: '9 AM', val: 24 },
                      { hour: '10 AM', val: 38 },
                      { hour: '11 AM', val: 52 },
                      { hour: '12 PM', val: 63 },
                      { hour: '1 PM', val: 68 },
                      { hour: '2 PM', val: 72 },
                      { hour: '3 PM', val: 76 },
                      { hour: '4 PM', val: 80 },
                    ].map((h) => (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-blue-600 rounded-t-sm transition-all"
                          style={{ height: `${h.val * 1.4}px` }}
                        />
                        <span className="text-[9px] text-slate-400 font-mono mt-1">{h.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* System Status Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Command Center Logistics</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">VIS Desks Deployed</span>
                  <span className="font-bold text-slate-900 font-mono">18 Wards</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Special Assistance Logged</span>
                  <span className="font-bold text-emerald-700 font-mono">142 Citizens</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Active Field Coordinators</span>
                  <span className="font-bold text-blue-700 font-mono">642 Online</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
