import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { ShieldCheck, ShieldAlert, Key, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminSecurityPage() {
  const incidents = await prisma.securityIncident.findMany({
    orderBy: { discoveredAt: 'desc' },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Governance Console</h1>
              <p className="text-xs text-slate-500 mt-1">
                Monitor security incidents, break-glass protocol requests, and statutory privacy governance.
              </p>
            </div>

            <Link
              href="/super-admin/privacy"
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Open Privacy & Retention Center
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard title="Security Incidents" value={incidents.length.toString()} subtitle="Reported events" icon={ShieldAlert} iconColor="text-rose-600" iconBgColor="bg-rose-50" />
            <StatCard title="Break-Glass Status" value="Locked" subtitle="Dual-authorization required" icon={Lock} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Enforced', type: 'success' }} />
            <StatCard title="MFA Enforcement" value="100%" subtitle="Super Admins & Admins" icon={Key} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
            <StatCard title="Data Protection" value="DPDP / ECI" subtitle="Compliant architecture" icon={ShieldCheck} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Security Incident Log</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {incidents.map((inc) => (
                <div key={inc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{inc.title}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">Scope: {inc.affectedScope}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                      {inc.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-600">
                      {inc.status}
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
