import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Archive, Download, CheckCircle2, RotateCw, Database, Clock } from 'lucide-react';

export default function SuperAdminBackupsPage() {
  const backups = [
    { id: 'bak-01', filename: 'campaignops_db_prod_2026-09-24_020000.sql.gz', size: '142 MB', type: 'FULL_SNAPSHOT', timestamp: 'Today at 02:00 AM', status: 'VERIFIED' },
    { id: 'bak-02', filename: 'campaignops_db_prod_2026-09-23_020000.sql.gz', size: '138 MB', type: 'FULL_SNAPSHOT', timestamp: 'Yesterday at 02:00 AM', status: 'VERIFIED' },
    { id: 'bak-03', filename: 'campaignops_db_prod_2026-09-22_020000.sql.gz', size: '135 MB', type: 'FULL_SNAPSHOT', timestamp: 'Sep 22, 2026', status: 'VERIFIED' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Database Backups & Disaster Recovery</h1>
              <p className="text-xs text-slate-500 mt-1">
                Automated daily snapshots, point-in-time recovery checkpoints, and multi-region database replication.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5" />
              Trigger On-Demand Backup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Automated Backup Schedule" value="Daily 02:00 UTC" subtitle="Retention: 90 Days" icon={Archive} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Recovery Point Objective (RPO)" value="< 15 Mins" subtitle="Continuous WAL Archiving" icon={Clock} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Compliant', type: 'success' }} />
            <StatCard title="Integrity Check Status" value="100% Passed" subtitle="Restore drills validated" icon={CheckCircle2} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Verified Database Snapshots</h3>
            <div className="divide-y divide-slate-100">
              {backups.map((b) => (
                <div key={b.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 font-mono text-[11px]">{b.filename}</h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">Size: {b.size} • Created: {b.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.status}
                    </span>
                    <button className="py-1 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold flex items-center gap-1">
                      <Download className="w-3 h-3 text-blue-600" /> Download
                    </button>
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
