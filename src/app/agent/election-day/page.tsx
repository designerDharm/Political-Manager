'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import {
  CalendarCheck,
  ArrowLeft,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Building,
  RotateCw,
  FileText,
  AlertCircle,
  X,
  Check,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';
import { offlineDB } from '@/lib/offline/db';

interface Voter {
  id: string;
  name: string;
  epicNumber: string;
  serialNumber: number;
  age: number;
  gender: string;
  guardianName: string | null;
  houseNumber: string;
  boothId: string;
  wardId: string;
  booth: { id: string; boothNumber: number; name: string; pollingStation: string | null };
  ward: { id: string; wardNumber: number; name: string };
  visEvents?: Array<{ id: string; eventType: string; occurredAt: string }>;
}

export default function AgentElectionDayPage() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [electionDayData, setElectionDayData] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Voter[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedReference, setIssuedReference] = useState<string | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Turnout recording modal for agent
  const [showTurnoutModal, setShowTurnoutModal] = useState(false);
  const [turnoutCount, setTurnoutCount] = useState('');
  const [turnoutHour, setTurnoutHour] = useState('11 AM');
  const [turnoutSaving, setTurnoutSaving] = useState(false);

  // Load campaign and initial data
  const loadInitialData = async () => {
    try {
      const campRes = await fetch('/api/v1/campaigns', { cache: 'no-store' });
      const campJson = await campRes.json();
      let activeId = '';
      if (campJson.success && campJson.data && campJson.data.length > 0) {
        activeId = campJson.data[0].id;
        setCampaignId(activeId);
      }

      if (activeId) {
        const edRes = await fetch(`/api/v1/election-day?campaignId=${activeId}`, { cache: 'no-store' });
        const edJson = await edRes.json();
        if (edJson.success) {
          setElectionDayData(edJson.data);
        }
      }
    } catch (err) {
      console.error('Failed to load election day data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useCampaignRealtime({
    campaignId: campaignId || undefined,
    enabled: !!campaignId,
    onEvent: () => {
      loadInitialData();
    },
  });

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !campaignId) return;

    try {
      setSearching(true);
      setIssueError(null);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await fetch(`/api/v1/voters?campaignId=${campaignId}&q=${encodeURIComponent(searchQuery.trim())}&limit=25`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
          return;
        }
      }

      // Offline fallback
      const cached = await offlineDB.searchCachedVoters(searchQuery);
      setSearchResults(cached as any);
    } catch (err: any) {
      setIssueError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleIssueVis = async (isReissue = false) => {
    if (!selectedVoter || !campaignId) return;

    try {
      setIssuing(true);
      setIssueError(null);
      setIssueSuccess(null);

      // Check online status
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await fetch('/api/v1/election-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: isReissue ? 'VIS_REISSUE' : 'VIS_ISSUE',
            campaignId,
            voterId: selectedVoter.id,
            boothId: selectedVoter.boothId,
            isReissue,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setIssueSuccess(isReissue ? 'VIS Slip Reissued' : 'VIS Slip Issued');
          setIssuedReference(json.data.referenceCode || `VIS-${selectedVoter.epicNumber}`);
          setShowSlipModal(true);
          await loadInitialData();
          return;
        } else {
          throw new Error(json.error?.message || 'Failed to issue VIS');
        }
      }

      // Offline Mode: enqueue to IndexedDB sync queue
      const mutationId = `mut_vis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await offlineDB.enqueueMutation({
        mutationId,
        campaignId,
        deviceId: 'agent_mobile',
        entityType: 'VIS_EVENT',
        entityId: selectedVoter.id,
        operation: 'CREATE',
        baseVersion: 1,
        payload: {
          voterId: selectedVoter.id,
          boothId: selectedVoter.boothId,
          eventType: isReissue ? 'REISSUED' : 'ISSUED',
        },
        clientOccurredAt: new Date().toISOString(),
        queuedAt: new Date().toISOString(),
        attemptCount: 0,
        localStatus: 'PENDING',
      });

      setIssueSuccess('Pending Sync (Recorded Offline)');
      setIssuedReference(`OFFLINE-${selectedVoter.epicNumber}`);
      setShowSlipModal(true);
    } catch (err: any) {
      setIssueError(err.message || 'Error issuing VIS');
    } finally {
      setIssuing(false);
    }
  };

  const handleRecordTurnout = async () => {
    if (!campaignId || !electionDayData?.boothSummaries?.[0]) return;
    const currentBooth = electionDayData.boothSummaries[0];
    const count = parseInt(turnoutCount, 10);
    if (isNaN(count) || count < 0) {
      setIssueError('Valid positive turnout count required');
      return;
    }

    try {
      setTurnoutSaving(true);
      const res = await fetch('/api/v1/election-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TURNOUT_SNAPSHOT',
          campaignId,
          boothId: currentBooth.id,
          turnoutHour,
          totalReported: count,
          source: 'AUTHORIZED_POLLING_AGENT',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record turnout');
      }

      setShowTurnoutModal(false);
      setTurnoutCount('');
      await loadInitialData();
    } catch (err: any) {
      setIssueError(err.message || 'Turnout entry failed');
    } finally {
      setTurnoutSaving(false);
    }
  };

  const booth = electionDayData?.boothSummaries?.[0];

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        {/* Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-tight">Polling Day Help Desk</h1>
              <span className="text-[10px] text-slate-400 font-medium">VIS Issuance & Polling Station Guidance</span>
            </div>
          </div>

          <button
            onClick={() => loadInitialData()}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4 text-blue-600" />
          </button>
        </header>

        <main className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Active Booth Status Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                Assigned Polling Sector
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Booth #{booth ? booth.boothNumber : '...'}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-0.5">{booth ? booth.name : 'Loading booth...'}</h3>
            <p className="text-[11px] text-slate-300">
              {booth?.pollingStation || 'Standard Polling Hall'} • W-{booth?.wardNumber}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Electors</span>
                <span className="text-xs font-black text-white">{booth ? booth.totalElectors : 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">VIS Slips</span>
                <span className="text-xs font-black text-amber-400">{booth ? booth.visIssuedCount : 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Turnout</span>
                <span className="text-xs font-black text-emerald-400">
                  {booth?.latestTurnout ? `${booth.latestTurnout.percentage}%` : 'Pending'}
                </span>
              </div>
            </div>

            {/* Turnout Action Button */}
            <div className="mt-3 pt-2">
              <button
                onClick={() => setShowTurnoutModal(true)}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Record Observer Turnout
              </button>
            </div>
          </div>

          {/* Neutral Legal Notice */}
          <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-blue-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Statutory Decoupling:</strong> Voter Information Slips (VIS) provide polling room guidance only.
              Issuing a slip does not mean the citizen voted or supports any candidate.
            </div>
          </div>

          {/* Voter Search Bar */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Find Voter in Booth #{booth ? booth.boothNumber : ''}
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="EPIC number, voter name, or serial..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 disabled:opacity-50"
              >
                {searching ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          {issueError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{issueError}</span>
            </div>
          )}

          {issueSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{issueSuccess}</span>
            </div>
          )}

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Matching Voters ({searchResults.length})
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {searchResults.map((v) => {
                  const isSelected = selectedVoter?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoter(v)}
                      className={`p-3 border rounded-xl transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{v.name}</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                            #{v.serialNumber}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          EPIC: <strong className="font-mono text-slate-700">{v.epicNumber}</strong> • House #{v.houseNumber}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Voter Action Card */}
          {selectedVoter && (
            <div className="bg-white border-2 border-blue-500/80 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 font-mono block">
                    Serial #{selectedVoter.serialNumber}
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{selectedVoter.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    Age {selectedVoter.age} • {selectedVoter.gender === 'M' ? 'Male' : 'Female'} • EPIC: {selectedVoter.epicNumber}
                  </p>
                </div>
                <button onClick={() => setSelectedVoter(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100">
                <span className="font-bold block text-slate-800">
                  Booth {selectedVoter.booth.boothNumber}: {selectedVoter.booth.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedVoter.booth.pollingStation || 'Room 1 Polling Hall'}
                </span>
              </div>

              {/* One-Tap VIS Issuance Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={issuing}
                  onClick={() => handleIssueVis(false)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {issuing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  Issue VIS Slip
                </button>
                <button
                  type="button"
                  disabled={issuing}
                  onClick={() => handleIssueVis(true)}
                  className="py-2.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Reissue
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Modal: Neutral VIS Print Preview */}
        {showSlipModal && selectedVoter && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-800">Neutral Voter Slip</span>
                <button onClick={() => setShowSlipModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-dashed border-slate-300 p-4 rounded-xl text-xs space-y-2.5 font-sans bg-slate-50/50">
                <div className="text-center pb-2 border-b border-slate-200">
                  <strong className="text-xs font-bold uppercase tracking-wider block text-slate-900">
                    Voter Information Slip
                  </strong>
                  <span className="text-[10px] text-slate-500">General Election 2026 • Polling Station Facilitation</span>
                  {issuedReference && (
                    <span className="font-mono text-[9px] text-blue-700 font-bold block mt-0.5">
                      Ref: {issuedReference}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Elector Name</span>
                    <strong className="text-slate-900">{selectedVoter.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Gender/Age</span>
                    <span className="text-slate-800">{selectedVoter.gender} / {selectedVoter.age}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">EPIC Number</span>
                    <strong className="font-mono text-slate-900">{selectedVoter.epicNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Serial in Part</span>
                    <strong className="text-blue-700">#{selectedVoter.serialNumber}</strong>
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200 text-[10px]">
                  <span className="text-slate-500 block">Polling Location:</span>
                  <strong className="text-slate-800 block">
                    Booth {selectedVoter.booth.boothNumber}: {selectedVoter.booth.name}
                  </strong>
                  <span className="text-slate-500">
                    {selectedVoter.booth.pollingStation || 'Room 1 Hall'}
                  </span>
                </div>

                <p className="text-[9px] text-slate-400 italic text-center pt-1 leading-tight">
                  * Polling station guidance only. Not an identity card or official ballot.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSlipModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    window.print();
                    setShowSlipModal(false);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Slip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Record Observer Turnout */}
        {showTurnoutModal && booth && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Record Booth Turnout</h3>
                  <span className="text-[10px] text-slate-500">Booth #{booth.boothNumber} ({booth.totalElectors} electors)</span>
                </div>
                <button onClick={() => setShowTurnoutModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Turnout Reporting Hour
                  </label>
                  <select
                    value={turnoutHour}
                    onChange={(e) => setTurnoutHour(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="9 AM">9:00 AM</option>
                    <option value="11 AM">11:00 AM</option>
                    <option value="1 PM">1:00 PM</option>
                    <option value="3 PM">3:00 PM</option>
                    <option value="5 PM">5:00 PM</option>
                    <option value="6 PM">6:00 PM (Final Poll)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Observed Elector Count
                  </label>
                  <input
                    type="number"
                    value={turnoutCount}
                    onChange={(e) => setTurnoutCount(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTurnoutModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={turnoutSaving}
                  onClick={handleRecordTurnout}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {turnoutSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Turnout'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AgentBottomNav />
      </div>
    </div>
  );
}
