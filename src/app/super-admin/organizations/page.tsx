import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { Building2, Plus, Users, Megaphone, ShieldCheck, ExternalLink } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminOrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { campaigns: true, users: true } },
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organizations & Tenants</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage political consultancies, party state committees, and client accounts in multi-tenant isolation.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Organization
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Active Organizations" value={orgs.length.toString()} subtitle="Licensed entities" icon={Building2} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Total Associated Users" value="1,842" subtitle="Across all orgs" icon={Users} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" />
            <StatCard title="Multi-Tenant Isolation" value="100%" subtitle="Enforced in DB layer" icon={ShieldCheck} iconColor="text-purple-600" iconBgColor="bg-purple-50" badge={{ text: 'Compliant', type: 'success' }} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Registered Organizations</h3>
            <div className="divide-y divide-slate-100">
              {orgs.map((o) => (
                <div key={o.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {o.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{o.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">Slug: {o.slug} • Plan: Enterprise Tier</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-slate-600">
                    <span><strong>{o._count.campaigns}</strong> Campaigns</span>
                    <span><strong>{o._count.users}</strong> Users</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
