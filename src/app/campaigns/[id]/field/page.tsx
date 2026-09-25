import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  MapPin,
  CheckCircle2,
  Clock,
  PieChart,
  Layers,
  Users,
  Compass,
  ArrowRight,
  ListFilter,
  Check,
} from 'lucide-react';

export const revalidate = 0;

export default async function FieldOperationsPage({ params }: { params: { id: string } }) {
  const [households, booths, tasks] = await Promise.all([
    prisma.household.findMany({
      take: 20,
      include: {
        booth: true,
        members: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.booth.findMany({
      take: 10,
      include: {
        ward: true,
        _count: { select: { households: true, voters: true } },
      },
    }),
    prisma.assignment.findMany({
      include: {
        user: true,
        createdBy: true,
      },
      take: 10,
    }),
  ]);

  const totalHouseholds = await prisma.household.count();
  const verifiedCount = await prisma.household.count({ where: { status: 'Verified' } });

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Field Operations & Booth Coverage</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Monitor field visits, assign booth sectors to field workers, and track door-to-door verification progress.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/campaigns/${params.id}/map`}
                className="py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                Open Geographic Map
              </Link>
              <Link
                href={`/campaigns/${params.id}/team`}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5" />
                Assign Field Team
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Targeted Households"
              value={totalHouseholds.toLocaleString()}
              subtitle="Registered across wards"
              icon={Layers}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Field Verified"
              value={verifiedCount.toLocaleString()}
              subtitle="Door-to-door confirmed"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Verified', type: 'success' }}
            />
            <StatCard
              title="Active Booth Sectors"
              value={booths.length.toString()}
              subtitle="Covering current ward"
              icon={MapPin}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Coverage Rate"
              value={`${totalHouseholds > 0 ? ((verifiedCount / totalHouseholds) * 100).toFixed(0) : 0}%`}
              subtitle="Target: 90% by campaign close"
              icon={PieChart}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              badge={{ text: totalHouseholds > 0 ? 'Pacing on track' : 'No Data', type: 'info' }}
            />
          </div>

          {/* Main Grid: Active Booths & Recent Household Visits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Booth Coverage Table (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Polling Booth Sectors</h3>
                  <p className="text-[11px] text-slate-500">Coverage and voter distribution per polling station</p>
                </div>
                <Link
                  href={`/campaigns/${params.id}/map`}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  View Map View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Booth</th>
                      <th className="py-2.5 px-3">Ward</th>
                      <th className="py-2.5 px-3">Households</th>
                      <th className="py-2.5 px-3">Voters</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">

                    {booths.map((b) => {
                      const boothHouseholds = b._count?.households || 0;
                      const boothVoters = b._count?.voters || 0;
                      const progressPct = boothHouseholds > 0 ? Math.round((boothHouseholds / (b.totalElectors > 0 ? b.totalElectors : 10)) * 100) : 0;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>Booth #{b.boothNumber}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{b.name}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">{b.ward?.name || `Ward ${b.ward?.wardNumber || '12'}`}</td>
                          <td className="py-3 px-3 font-mono text-slate-700">{boothHouseholds}</td>
                          <td className="py-3 px-3 font-mono text-slate-700">{boothVoters}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, progressPct)}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{progressPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href={`/campaigns/${params.id}/voters?boothId=${b.id}`}
                              className="text-[11px] text-blue-600 font-bold hover:underline"
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>


            {/* Quick Field Assignments (1 col) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Field Assignments</h3>
                <span className="text-[10px] font-bold text-slate-400 font-mono">{tasks.length} Active</span>
              </div>

              <div className="space-y-3">
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{t.taskType}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Assignee: <span className="font-semibold text-slate-700">{t.user?.displayName || 'Field Agent'}</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Scope: {t.scopeTarget}</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Assigned
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={`/campaigns/${params.id}/team`}
                className="mt-4 block w-full text-center py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              >
                Manage All Field Agents
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
