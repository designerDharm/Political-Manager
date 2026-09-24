import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { Megaphone, Plus, Users, Calendar, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      organization: true,
      _count: { select: { voters: true, households: true, issues: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Instances Directory</h1>
              <p className="text-xs text-slate-500 mt-1">
                Oversee all political campaigns active across electoral constituencies.
              </p>
            </div>

            <Link
              href="/campaigns/new"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Provision New Campaign
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Total Campaigns" value={campaigns.length.toString()} subtitle="Across all clients" icon={Megaphone} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Active Campaigns" value={campaigns.filter((c) => c.status === 'ACTIVE').length.toString()} subtitle="In live operations" icon={Calendar} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Running', type: 'success' }} />
            <StatCard title="Managed Electors" value="1,24,580" subtitle="In electoral registry" icon={Users} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Active & Provisioned Campaigns</h3>
            <div className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <div key={c.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                    <p className="text-xs text-slate-500">
                      Org: {c.organization?.name} • Candidate: <strong>{c.candidateName}</strong> ({c.partyName})
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Voters: <strong>{c._count.voters}</strong></span>
                      <span>•</span>
                      <span>Households: <strong>{c._count.households}</strong></span>
                      <span>•</span>
                      <span>Issues: <strong>{c._count.issues}</strong></span>
                    </div>
                  </div>

                  <Link
                    href={`/campaigns/${c.id}`}
                    className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
