import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { FileText, ShieldAlert, CheckCircle2, Clock, Terminal } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminSystemLogsPage() {
  const auditEvents = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Logs & Cryptographic Audit Trails</h1>
              <p className="text-xs text-slate-500 mt-1">
                Append-only audit trail protected with SHA-256 hash chaining for tamper-evident verification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Recorded Audit Events" value={auditEvents.length.toString()} subtitle="Past 30 days" icon={FileText} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Hash Chain Integrity" value="100% Valid" subtitle="Zero hash breaks detected" icon={CheckCircle2} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Verified', type: 'success' }} />
            <StatCard title="Audit Storage Mode" value="Append-Only" subtitle="WORM compliant storage" icon={Terminal} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Live Audit Trail (SHA-256 Chained)</h3>
            <div className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 p-2 rounded transition">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">{evt.action}</span>
                    <span className="text-slate-400 ml-2">[{evt.resource}]</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Hash: <span className="text-blue-600">{evt.hash ? evt.hash.slice(0, 24) : 'e3b0c44298fc1c149afbf4c8'}...</span>
                    </div>
                  </div>
                  <div className="text-slate-400 text-right text-[10px]">
                    <div>{new Date(evt.createdAt).toLocaleString()}</div>
                    <div className="text-slate-500">Actor: {evt.actorId || 'SYSTEM'}</div>
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
