import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { Users, UserCheck, Shield, Plus, Key } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      organization: true,
      devices: true,
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Users & Access Control</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage user identities, platform role hierarchy (RBAC), and device authentication state.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Provision User
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Total Platform Users" value={users.length.toString()} subtitle="Super admins & agents" icon={Users} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Active Sessions" value="28" subtitle="Field devices connected" icon={UserCheck} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Live', type: 'success' }} />
            <StatCard title="Role Protection" value="RBAC Strict" subtitle="Enforced on all routes" icon={Shield} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">User Accounts</h3>
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center">
                      {u.displayName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{u.displayName}</h4>
                      <p className="text-slate-500 text-[11px] font-mono">{u.email} • Phone: {u.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                      {u.role}
                    </span>
                    <span className="text-slate-500 text-[11px]">{u.organization?.name}</span>
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
