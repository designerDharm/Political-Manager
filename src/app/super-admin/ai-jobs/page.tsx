import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Cpu, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export default function SuperAdminAiJobsPage() {
  const jobs = [
    { id: 'job-01', model: 'DocumentAI-OCR-v2', task: 'Electoral Roll Box Segmentation', status: 'Completed', latency: '320ms / page', confidence: '94.2%' },
    { id: 'job-02', model: 'HouseholdCluster-Model', task: 'Address Normalization & Family Grouping', status: 'Completed', latency: '45ms / cluster', confidence: '91.8%' },
    { id: 'job-03', model: 'DuplicateDetector-v3', task: 'Fuzzy Voter Deduplication (Form 6/7/8)', status: 'Completed', latency: '12ms / pair', confidence: '96.5%' },
    { id: 'job-04', model: 'GovernedAnalytics-Engine', task: 'Strict Policy-Guarded NL Query Dispatches', status: 'Active', latency: '180ms / query', confidence: '100% Policy Pass' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Jobs & Model Workers</h1>
              <p className="text-xs text-slate-500 mt-1">
                Supervise OCR extraction models, household grouping workers, and non-inference guardrail policy enforcement.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard title="Active Model Workers" value="4 Workers" subtitle="All microservices operational" icon={Cpu} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Guardrail Violation Rate" value="0.0%" subtitle="Policy layer 100% effective" icon={ShieldAlert} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Guarded', type: 'success' }} />
            <StatCard title="Avg Inference Latency" value="114 ms" subtitle="Within SLA benchmarks" icon={Sparkles} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
            <StatCard title="Non-Inference Rule" value="Enforced" subtitle="Zero voter profiling allowed" icon={CheckCircle2} iconColor="text-amber-600" iconBgColor="bg-amber-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Registered AI Engines & Workers</h3>
            <div className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <div key={j.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      {j.task}
                    </h4>
                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">Model Engine: {j.model}</p>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span className="font-mono">Latency: {j.latency}</span>
                    <span className="font-bold text-emerald-700 font-mono">Conf: {j.confidence}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {j.status}
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
