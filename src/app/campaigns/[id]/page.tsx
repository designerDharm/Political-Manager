import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
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
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const revalidate = 0;

export default async function CampaignAdminDashboard({
  params,
}: {
  params: { id: string };
}) {
  const [voterCount, householdCount, issueCount, boothCount] = await Promise.all([
    prisma.voter.count(),
    prisma.household.count(),
    prisma.issue.count(),
    prisma.booth.count(),
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

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header Banner & Election Switcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Active Campaign
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sharma for Assembly 2026</h1>
              <p className="text-xs text-slate-500 mt-1">Ward 12 • Gandhi Nagar • Assembly Constituency 45</p>
            </div>

            <div className="flex items-center gap-3">
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

          {/* Campaign Progress Gauge directly matching mobile and desktop specs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Campaign Household Progress</h3>
                <p className="text-xs text-slate-500">67% Households Completed (804 of 1,200 households visited)</p>
              </div>
              <span className="text-2xl font-black text-blue-600">67%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: '67%' }} />
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Registered Voters"
              value={voterCount || 2840}
              subtitle="Imported & normalized"
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Households Visited"
              value="804"
              subtitle="67% of 1,200 total target"
              icon={CheckCircle}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'On Track', type: 'success' }}
            />
            <StatCard
              title="Pending Visits"
              value="329"
              subtitle="Assigned to active field agents"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Field Issues Reported"
              value={issueCount || 24}
              subtitle="Across 4 operational categories"
              icon={AlertTriangle}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
              badge={{ text: 'Action Req', type: 'danger' }}
            />
          </div>

          {/* Quick Actions Grid */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Quick Operations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Voters List', href: `/campaigns/${params.id}/voters`, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'Coverage Map', href: `/campaigns/${params.id}/map`, icon: MapPin, color: 'text-rose-600 bg-rose-50' },
                { label: 'Team', href: `/campaigns/${params.id}/team`, icon: UsersRound, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Analytics', href: `/campaigns/${params.id}/analytics`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
                { label: 'Election Day', href: `/campaigns/${params.id}/election-day`, icon: CalendarCheck, color: 'text-amber-600 bg-amber-50' },
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
