'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Building,
  UserCheck,
  FileText,
  RotateCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Play,
  StopCircle,
  Calendar,
  X,
  Check,
  TrendingUp,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';

interface ElectionDayData {
  campaign: {
    id: string;
    name: string;
    electionName: string;
    electionDate: string | null;
    electionDayStatus: 'NOT_STARTED' | 'ACTIVE' | 'CLOSED';
    openedAt: string | null;
    closedAt: string | null;
  };
  metrics: {
    totalElectors: number;
    totalBooths: number;
    totalVisIssued: number;
    openIssuesCount: number;
    recentTurnoutPercentage: number;
  };
  boothSummaries: Array<{
    id: string;
    boothNumber: number;
    name: string;
    wardId: string;
    wardNumber: number;
    wardName: string;
    pollingStation: string | null;
    totalElectors: number;
    registeredVoters: number;
    visIssuedCount: number;
    openIssuesCount: number;
    assignedAgents: Array<{ id: string; name: string; email: string }>;
    latestTurnout: {
      totalReported: number;
      percentage: number;
      hour: string;
      source: string;
      recordedAt: string;
    } | null;
  }>;
  turnoutSnapshots: Array<{
    id: string;
    boothId: string;
    turnoutHour: string;
    totalReported: number;
    percentage: number;
    source: string;
    recordedAt: string;
    booth: { id: string; boothNumber: number; name: string };
  }>;
  recentVisEvents: Array<{
    id: string;
    voterId: string;
    boothId: string;
    eventType: string;
    occurredAt: string;
    voter: { id: string; epicNumber: string; name: string; serialNumber: number };
    booth: { id: string; boothNumber: number; name: string };
    agent: { id: string; displayName: string };
  }>;
}

export function ElectionDayClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<ElectionDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Turnout entry modal
  const [turnoutModalBooth, setTurnoutModalBooth] = useState<any | null>(null);
  const [turnoutCount, setTurnoutCount] = useState('');
  const [turnoutHour, setTurnoutHour] = useState('11 AM');
  const [turnoutSource, setTurnoutSource] = useState('OFFICIAL_ENTRY');
  const [turnoutError, setTurnoutError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/election-day?campaignId=${campaignId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error?.message || 'Failed to load election day status');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to election day operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  // Hook into Realtime SSE
  useCampaignRealtime({
    campaignId,
    enabled: true,
    onEvent: (evt) => {
      if (
        evt.type.includes('ELECTION_DAY') ||
        evt.type.includes('VIS_') ||
        evt.type.includes('TURNOUT_') ||
        evt.type.includes('ISSUE_')
      ) {
        fetchData();
      }
    },
  });

  const handleToggleState = async (action: 'ACTIVATE' | 'CLOSE') => {
    try {
      setActionLoading(true);
      const type = action === 'ACTIVATE' ? 'ACTIVATE_ELECTION_DAY' : 'CLOSE_ELECTION_DAY';
      const res = await fetch('/api/v1/election-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, campaignId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Failed to ${action.toLowerCase()} election day`);
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTurnout = async () => {
    if (!turnoutModalBooth) return;
    const count = parseInt(turnoutCount, 10);
    if (isNaN(count) || count < 0) {
      setTurnoutError('Valid positive turnout count required (0 or greater)');
      return;
    }
    if (turnoutModalBooth.totalElectors && count > turnoutModalBooth.totalElectors) {
      setTurnoutError(`Turnout count (${count}) cannot exceed booth electors (${turnoutModalBooth.totalElectors})`);
      return;
    }

    try {
      setActionLoading(true);
      setTurnoutError(null);
      const res = await fetch('/api/v1/election-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TURNOUT_SNAPSHOT',
          campaignId,
          boothId: turnoutModalBooth.id,
          turnoutHour,
          totalReported: count,
          source: turnoutSource,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record turnout');
      }
      setTurnoutModalBooth(null);
      setTurnoutCount('');
      await fetchData();
    } catch (err: any) {
      setTurnoutError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const status = data?.campaign.electionDayStatus || 'NOT_STARTED';

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Election Day Command Center</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status === 'CLOSED'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {status === 'ACTIVE'
                ? 'Operations Active (Live Polls)'
                : status === 'CLOSED'
                ? 'Operations Closed'
                : 'Not Activated'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Database-backed operational coordination of Voter Information Slips (VIS), booth help desks, and aggregate turnout.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {status === 'NOT_STARTED' && (
            <button
              onClick={() => handleToggleState('ACTIVATE')}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Activate Election Day
            </button>
          )}

          {status === 'ACTIVE' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to close Election Day operations for this campaign?')) {
                  handleToggleState('CLOSE');
                }
              }}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <StopCircle className="w-3.5 h-3.5" /> Close Polls & Archive Day
            </button>
          )}

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white shadow-sm transition hover:bg-slate-50"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Semantic Clarification Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-blue-950">Statutory Election Semantics & Decoupled Metrics</span>
          <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
            Voter Information Slips (VIS) reflect external facilitation to assist voters with their polling booth location. 
            <strong> VIS issuance does not mean the person voted</strong>, nor does it infer candidate vote choice. 
            Aggregate turnout is tracked separately from official and authorized booth observer reports.
          </p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Electors"
          value={data ? data.metrics.totalElectors.toLocaleString() : '...'}
          subtitle="Imported voter roll registry"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Reported Aggregate Turnout"
          value={data && data.metrics.recentTurnoutPercentage ? `${data.metrics.recentTurnoutPercentage}%` : '0%'}
          subtitle="Authorized booth observer reports"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          badge={{
            text: data && data.metrics.recentTurnoutPercentage > 0 ? 'Reported' : 'Awaiting Polls',
            type: data && data.metrics.recentTurnoutPercentage > 0 ? 'success' : 'info',
          }}
        />
        <StatCard
          title="Voter Slips Issued (VIS)"
          value={data ? data.metrics.totalVisIssued.toLocaleString() : '...'}
          subtitle="Civic help desk facilitation"
          icon={FileText}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="Active Booth Sectors"
          value={data ? `${data.metrics.totalBooths} Booths` : '...'}
          subtitle={`${data ? data.metrics.openIssuesCount : 0} open booth incidents`}
          icon={Building}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50"
        />
      </div>

      {/* Booth-Wise Operations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Booth Operational Matrix</h3>
            <p className="text-xs text-slate-500">Live booth status, field agent assignments, slip requests, and reported turnout.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Booth</th>
                <th className="py-3 px-4">Polling Station</th>
                <th className="py-3 px-4">Electors</th>
                <th className="py-3 px-4">Assigned Agents</th>
                <th className="py-3 px-4">VIS Issued</th>
                <th className="py-3 px-4">Reported Turnout</th>
                <th className="py-3 px-4">Issues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data && data.boothSummaries.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">Booth {b.boothNumber}</span>
                    <span className="block text-[10px] text-slate-400">W-{b.wardNumber} ({b.wardName})</span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate">
                    <span className="text-slate-800 font-medium">{b.name}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{b.pollingStation || 'Location standard'}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {b.totalElectors}
                  </td>
                  <td className="py-3 px-4">
                    {b.assignedAgents.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {b.assignedAgents.map((ag) => (
                          <span key={ag.id} className="text-[11px] font-semibold text-slate-700">
                            {ag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {b.visIssuedCount}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {b.latestTurnout ? (
                      <div>
                        <span className="font-mono font-black text-emerald-700">
                          {b.latestTurnout.percentage}%
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {b.latestTurnout.totalReported} electors ({b.latestTurnout.hour})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Pending poll</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {b.openIssuesCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {b.openIssuesCount} Open
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setTurnoutModalBooth(b);
                        setTurnoutCount(b.latestTurnout ? b.latestTurnout.totalReported.toString() : '');
                        setTurnoutError(null);
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm"
                    >
                      Record Turnout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Turnout Modal */}
      {turnoutModalBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Aggregate Turnout
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booth {turnoutModalBooth.boothNumber}: {turnoutModalBooth.name} ({turnoutModalBooth.totalElectors} electors)
                </p>
              </div>
              <button
                onClick={() => setTurnoutModalBooth(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {turnoutError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs mb-4">
                {turnoutError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turnout Reporting Hour
                </label>
                <select
                  value={turnoutHour}
                  onChange={(e) => setTurnoutHour(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="7 AM">7:00 AM</option>
                  <option value="9 AM">9:00 AM</option>
                  <option value="11 AM">11:00 AM</option>
                  <option value="1 PM">1:00 PM</option>
                  <option value="3 PM">3:00 PM</option>
                  <option value="5 PM">5:00 PM</option>
                  <option value="6 PM">6:00 PM (Final Poll)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Reported Elector Count
                </label>
                <input
                  type="number"
                  value={turnoutCount}
                  onChange={(e) => setTurnoutCount(e.target.value)}
                  placeholder="e.g. 520"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Source Classification
                </label>
                <select
                  value={turnoutSource}
                  onChange={(e) => setTurnoutSource(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="OFFICIAL_ENTRY">Official Polling Station Figure</option>
                  <option value="AUTHORIZED_POLLING_AGENT">Authorized Polling Agent Observation</option>
                  <option value="ESTIMATED_SAMPLE">Sample Estimation</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 block mb-0.5">Statutory Audit Separation:</span>
                Aggregate turnout numbers are completely separate from civic voter information slips (VIS).
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTurnoutModalBooth(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveTurnout}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Save Turnout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
