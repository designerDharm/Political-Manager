import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

export const revalidate = 0;

export default async function ReportsPage({ params }: { params: { id: string } }) {
  const reportsList = [
    {
      id: 'rep-01',
      title: 'Daily Voter Coverage & Contact Audit',
      type: 'OPERATIONAL_CSV',
      format: 'CSV / Excel',
      generatedAt: 'Today at 08:00 AM',
      records: '12,480 households',
      description: 'Breakdown of households visited, contacted, verified, and pending door-to-door follow-up.',
    },
    {
      id: 'rep-02',
      title: 'Booth-wise Voter Information Slip (VIS) Delivery Log',
      type: 'STATUTORY_COMPLIANCE_PDF',
      format: 'PDF',
      generatedAt: 'Yesterday at 06:30 PM',
      records: '78,432 slips',
      description: 'Audit log of civic voter slip distribution. Strictly non-partisan locator assistance register.',
    },
    {
      id: 'rep-03',
      title: 'Electoral Roll Ingestion Quality & Anomaly Report',
      type: 'DATA_QUALITY_PDF',
      format: 'PDF',
      generatedAt: 'Sep 22, 2026',
      records: '9 Anomalies flagged',
      description: 'Summary of OCR confidence distribution, duplicate candidates, and multi-family house clusters.',
    },
    {
      id: 'rep-04',
      title: 'Constituency Community Issues & Civic Grievance Register',
      type: 'ISSUES_XLSX',
      format: 'Excel',
      generatedAt: 'Sep 21, 2026',
      records: '124 issues',
      description: 'Categorized catalog of reported local infrastructure complaints, priority levels, and resolution status.',
    },
  ];

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
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Reports & Data Exports</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  Audit Export Center
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generate operational summaries, statutory booth registers, and audit export packages with privacy governance controls.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Download className="w-3.5 h-3.5" />
              Generate New Export
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Available Reports"
              value="4 Standard"
              subtitle="Operational & Statutory"
              icon={FileSpreadsheet}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Generated Exports"
              value="18"
              subtitle="Past 30 days"
              icon={FileCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Archived', type: 'success' }}
            />
            <StatCard
              title="Audit Hash Protection"
              value="SHA-256"
              subtitle="Tamper-evident verification"
              icon={CheckCircle2}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Non-Inference Compliant"
              value="100%"
              subtitle="Zero political profiling export"
              icon={Layers}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              badge={{ text: 'Strict SSoT', type: 'info' }}
            />
          </div>

          {/* Reports Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Standard Operational Exports</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filtered by: Current Campaign Scope</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {reportsList.map((r) => (
                <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2 rounded-lg transition">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{r.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span>Format: <strong className="text-slate-700">{r.format}</strong></span>
                        <span>•</span>
                        <span>Generated: {r.generatedAt}</span>
                        <span>•</span>
                        <span>Scope: <strong className="text-slate-700">{r.records}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button className="py-2 px-3.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-center shadow-sm">
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Download File
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
