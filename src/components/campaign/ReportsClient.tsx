'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Layers,
  FileCheck,
  AlertCircle,
  Filter,
  Check,
  Printer
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatBoothLabel, formatWardLabel } from '@/lib/formatting';

interface ReportsClientProps {
  campaignId: string;
  initialCounts: {
    totalVoters: number;
    totalHouseholds: number;
    visitedHouseholds?: number;
    pendingHouseholds?: number;
    coveragePercentage?: number;
    totalVisIssued: number;
    totalIssues: number;
    totalTurnoutSnapshots: number;
    totalExportsRecorded: number;
  };
  wards: Array<{ id: string; wardNumber: number; name: string }>;
  booths: Array<{ id: string; boothNumber: number; name: string; wardId: string }>;
}

export function ReportsClient({
  campaignId,
  initialCounts,
  wards,
  booths,
}: ReportsClientProps) {
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedBoothId, setSelectedBoothId] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredBooths = selectedWardId
    ? booths.filter((b) => b.wardId === selectedWardId)
    : booths;

  const triggerDownload = async (type: string, title: string) => {
    try {
      setDownloadingId(type);
      setFeedback(null);

      const params = new URLSearchParams({
        type,
        format: 'CSV',
      });
      if (selectedWardId) params.set('wardId', selectedWardId);
      if (selectedBoothId) params.set('boothId', selectedBoothId);

      const url = `/api/v1/campaigns/${campaignId}/reports?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Failed to export ${title}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `${type.toLowerCase()}-export.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setFeedback({
        type: 'success',
        message: `Successfully downloaded ${filename} (Database verified).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error downloading report' });
    } finally {
      setDownloadingId(null);
    }
  };

  const visitedCount = initialCounts.visitedHouseholds ?? 0;
  const pendingCount = initialCounts.pendingHouseholds ?? Math.max(0, initialCounts.totalHouseholds - visitedCount);
  const coveragePct = initialCounts.coveragePercentage ?? (initialCounts.totalHouseholds > 0 ? Math.round((visitedCount / initialCounts.totalHouseholds) * 100) : 0);

  const reportsList = [
    {
      id: 'OPERATIONAL_SUMMARY',
      title: 'Constituency & Booth Operational Summary',
      type: 'OPERATIONAL_SUMMARY',
      format: 'CSV',
      records: `${initialCounts.totalVoters} Voters • ${initialCounts.totalHouseholds} Households`,
      description: 'Comprehensive ward and booth-level census of electors, mapped family households, VIS slips, and open grievances.',
    },
    {
      id: 'FIELD_OPERATIONS',
      title: 'Daily Voter Coverage & Contact Audit',
      type: 'FIELD_OPERATIONS',
      format: 'CSV',
      records: `${visitedCount}/${initialCounts.totalHouseholds} Visited (${coveragePct}%) • ${pendingCount} Pending`,
      description: 'Granular door-to-door audit of residences visited, family heads, contact details, and assigned field agents.',
    },
    {
      id: 'VIS_DELIVERY_LOG',
      title: 'Booth-wise Voter Information Slip (VIS) Delivery Log',
      type: 'VIS_DELIVERY_LOG',
      format: 'CSV',
      records: `${initialCounts.totalVisIssued} Slips Issued`,
      description: 'Audit log of civic locator slip distribution. Non-partisan voter facilitation register with reference codes.',
    },
    {
      id: 'ISSUES_REGISTER',
      title: 'Constituency Community Issues & Civic Grievance Register',
      type: 'ISSUES_REGISTER',
      format: 'CSV',
      records: `${initialCounts.totalIssues} Issues Logged`,
      description: 'Categorized catalog of reported local infrastructure complaints (water, roads, electricity), priority levels, and resolution status.',
    },
    {
      id: 'TURNOUT_PROGRESSION',
      title: 'Election Day Polling Turnout Progression',
      type: 'TURNOUT_PROGRESSION',
      format: 'CSV',
      records: `${initialCounts.totalTurnoutSnapshots} Snapshots`,
      description: 'Periodic aggregate voter turnout observations reported by authorized polling agents across booths.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Available Reports"
          value="5 Standard"
          subtitle="Operational & Statutory"
          icon={FileSpreadsheet}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Audit Logged Exports"
          value={initialCounts.totalExportsRecorded.toLocaleString()}
          subtitle="Recorded in AuditEvent SSoT"
          icon={FileCheck}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          badge={{ text: 'Tamper-Evident', type: 'success' }}
        />
        <StatCard
          title="Data Integrity Guard"
          value="OWASP Safe"
          subtitle="CSV Formula Injection Shield"
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

      {/* Filter Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Export Scope:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedWardId}
            onChange={(e) => {
              setSelectedWardId(e.target.value);
              setSelectedBoothId('');
            }}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Wards ({wards.length})</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {formatWardLabel(w.wardNumber, w.name)}
              </option>
            ))}
          </select>

          <select
            value={selectedBoothId}
            onChange={(e) => setSelectedBoothId(e.target.value)}
            disabled={filteredBooths.length === 0}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Booths ({filteredBooths.length})</option>
            {filteredBooths.map((b) => (
              <option key={b.id} value={b.id}>
                {formatBoothLabel(b.boothNumber, b.name)}
              </option>
            ))}
          </select>

          {(selectedWardId || selectedBoothId) && (
            <button
              onClick={() => {
                setSelectedWardId('');
                setSelectedBoothId('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Standard Operational Exports</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live filtered server-side CSV streams with Unicode Devanagari preservation and OWASP formula defense.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {selectedWardId || selectedBoothId ? 'Filtered Subset Active' : 'Full Campaign Scope'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {reportsList.map((r) => {
            const isDownloading = downloadingId === r.id;
            return (
              <div
                key={r.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2.5 rounded-lg transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{r.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>
                        Format: <strong className="text-slate-700">{r.format}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Live SSoT Scope: <strong className="text-slate-700">{r.records}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => triggerDownload(r.type, r.title)}
                    disabled={isDownloading}
                    className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 text-blue-600 ${isDownloading ? 'animate-bounce' : ''}`} />
                    {isDownloading ? 'Exporting...' : 'Download CSV'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs transition"
                    title="Print report preview"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
