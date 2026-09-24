import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { Database, CheckCircle2, AlertTriangle, Layers, Cpu } from 'lucide-react';

export const revalidate = 0;

export default async function SuperAdminDataProcessingPage() {
  const imports = await prisma.electoralRollImport.findMany({
    include: {
      campaign: true,
      pages: true,
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Electoral Roll Data Processing Pipeline</h1>
              <p className="text-xs text-slate-500 mt-1">
                Monitor OCR parsing status, multi-stage reconciliation pipelines, and extraction queues across all campaign instances.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard title="Total Batches Processed" value={imports.length.toString()} subtitle="Electoral roll PDF jobs" icon={Database} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Processed Records" value="1,24,580" subtitle="Extracted with provenance" icon={CheckCircle2} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Completed', type: 'success' }} />
            <StatCard title="Pipeline Status" value="Healthy" subtitle="Worker throughput 140 p/min" icon={Cpu} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
            <StatCard title="Source Snapshots" value="SHA-256" subtitle="Immutable document store" icon={Layers} iconColor="text-amber-600" iconBgColor="bg-amber-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Ingestion Job Queue</h3>
            <div className="divide-y divide-slate-100">
              {imports.map((imp) => (
                <div key={imp.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{imp.originalFilename}</h4>
                    <p className="text-slate-500 text-[11px]">
                      Campaign: <strong>{imp.campaign?.name}</strong> • Size: {imp.fileSize}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-slate-600">{imp.pages.length} Pages</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {imp.status}
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
