'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  Home,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  ArrowRight,
  Filter,
  Eye,
  Edit2,
  ArrowRightLeft,
  Scissors,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function HouseholdsListPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [runningGrouping, setRunningGrouping] = useState(false);
  const [households, setHouseholds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [summary, setSummary] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchHouseholds = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/households?campaignId=${params.id}&page=${page}&limit=25`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch households');

      setHouseholds(json.data || []);
      if (json.meta?.summary) setSummary(json.meta.summary);
      if (json.meta?.pagination) setTotalPages(json.meta.pagination.totalPages || 1);
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error loading households' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, [params.id, statusFilter, page]);

  const handleRunGrouping = async () => {
    setRunningGrouping(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/v1/households/grouping/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: params.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Grouping failed');

      setFeedback({
        type: 'success',
        message: `Grouping completed! Evaluated ${json.data.votersEvaluated} voters. Created ${json.data.householdsCreated} households, updated ${json.data.householdsUpdated}.`,
      });
      await fetchHouseholds();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to execute grouping engine' });
    } finally {
      setRunningGrouping(false);
    }
  };

  const handleConfirmHousehold = async (hid: string) => {
    try {
      const res = await fetch(`/api/v1/households/${hid}/confirm`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to confirm household');

      setFeedback({ type: 'success', message: `Household ${json.data.code} confirmed!` });
      await fetchHouseholds();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={params.id} />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Link href={`/campaigns/${params.id}/voters`} className="hover:underline">Voters</Link>
                <span>&gt;</span>
                <span className="text-slate-900 font-semibold">Households</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Household & Family Units</h1>
              <p className="text-xs text-slate-500 mt-1">
                Authoritative family clusters grouped deterministically from published electoral roll data.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunGrouping}
                disabled={runningGrouping}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {runningGrouping ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Evaluating Electoral Records...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Run / Re-evaluate Grouping</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-4 mb-6 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Metrics */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Total Households</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{summary.totalHouseholds}</span>
                <span className="text-[10px] text-slate-400">Database units</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Total Voters</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{summary.totalVoters}</span>
                <span className="text-[10px] text-slate-400">Authoritative electors</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Ungrouped Electors</span>
                <span className={`text-2xl font-bold mt-1 block ${summary.ungroupedVoters > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {summary.ungroupedVoters}
                </span>
                <span className="text-[10px] text-slate-400">Pending grouping</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Avg Household Size</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {summary.totalHouseholds > 0
                    ? ((summary.totalVoters - summary.ungroupedVoters) / summary.totalHouseholds).toFixed(1)
                    : '0'}
                </span>
                <span className="text-[10px] text-slate-400">Members per unit</span>
              </div>
            </div>
          )}

          {/* Search & Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHouseholds()}
                placeholder="Search by household code (H-001), house number, address, member name..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold">
              {['ALL', 'CONFIRMED', 'NEEDS_REVIEW', 'SUGGESTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Household Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-sm">Loading households from PostgreSQL SSoT...</p>
            </div>
          ) : households.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No households found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Click &ldquo;Run / Re-evaluate Grouping&rdquo; to group voters into family clusters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {households.map((h) => {
                let evidenceList: string[] = [];
                try {
                  evidenceList = JSON.parse(h.evidenceSignals || '[]');
                } catch {}

                return (
                  <div
                    key={h.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-md transition p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-blue-600">{h.code}</span>
                          <span className="text-xs font-semibold text-slate-900">House #{h.houseNumber}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'Confirmed' || h.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.status === 'NeedsReview'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium mb-1 truncate">{h.address}</p>
                      <p className="text-[11px] text-slate-400 mb-3">
                        {h.booth ? `Booth ${h.booth.boothNumber} - ${h.booth.name}` : 'Unassigned Booth'}
                      </p>

                      {/* Evidence Signals */}
                      {evidenceList.length > 0 && (
                        <div className="mb-3 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidence Signals</span>
                          {evidenceList.slice(0, 2).map((sig, idx) => (
                            <p key={idx} className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>{sig}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Members */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Members ({h.members?.length || 0})
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {h.members?.map((m: any) => (
                            <div key={m.id} className="p-1.5 bg-slate-50 rounded border border-slate-100 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800">{m.name}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5">({m.epicNumber})</span>
                              </div>
                              <span className="text-[10px] text-slate-500">{m.age} yrs / {m.gender}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/campaigns/${params.id}/households/${h.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span>View Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {h.status !== 'Confirmed' && h.status !== 'Verified' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmHousehold(h.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirm</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
