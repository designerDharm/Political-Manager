'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import { OfflineSyncStatusBadge } from '@/components/pwa/OfflineSyncStatusBadge';
import {
  Search,
  ArrowLeft,
  User,
  Home,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  RotateCw,
  WifiOff,
} from 'lucide-react';
import { offlineDB } from '@/lib/offline/db';

export default function AgentSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/v1/auth/me');
        const json = await res.json();
        if (json.data?.user) {
          setSessionUser(json.data.user);
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    async function searchElectors() {
      setLoading(true);
      // Online search
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const params = new URLSearchParams();
          if (searchTerm.trim()) {
            params.set('q', searchTerm.trim());
          }
          params.set('limit', '50');

          const activeCampaignId = sessionUser?.campaigns?.[0]?.campaignId;
          if (activeCampaignId) {
            params.set('campaignId', activeCampaignId);
          }

          const res = await fetch(`/api/v1/voters?${params.toString()}`);
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setVoters(json.data);
            setLoading(false);
            return;
          }
        } catch {
          // Network failed, fall through to offline search
        }
      }

      // Offline search fallback
      try {
        const localMatches = await offlineDB.searchCachedVoters(searchTerm);
        setVoters(localMatches);
      } catch (err) {
        console.error('Failed to search cached voters:', err);
        setVoters([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      searchElectors();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, sessionUser]);

  const filtered = voters;
  const scopeDesc = sessionUser?.campaigns?.[0]?.scopeType === 'ALL'
    ? 'All Campaign Precincts'
    : 'Assigned Booth Scope';

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header with Search Input */}
        <header className="p-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-bold text-base text-slate-900">Search Electors & Homes</h1>
            </div>
            <OfflineSyncStatusBadge campaignId={sessionUser?.campaigns?.[0]?.campaignId} />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Voter Name, EPIC #, or Household..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              autoFocus
            />
          </div>
        </header>

        <main className="p-4 flex-1 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{filtered.length} Results found</span>
            <span className="font-mono text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {scopeDesc}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-xs">Searching electors...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No electors or households found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try another search term within your assigned sector.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => {
                const hid = v.household?.code || v.householdId || 'H-001';
                const status = v.household?.status || 'Pending';
                return (
                  <Link
                    key={v.id}
                    href={`/agent/visit/${hid}`}
                    className="p-3 border border-slate-100 rounded-xl bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition flex items-center justify-between block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {v.name.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{v.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          EPIC: {v.epicNumber || 'N/A'} • {v.household?.code || `House #${v.houseNumber}`}
                        </p>
                        {v.booth && (
                          <p className="text-[10px] text-slate-400">
                            Booth #{v.booth.boothNumber} - {v.booth.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status === 'Verified' || status === 'Confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}

