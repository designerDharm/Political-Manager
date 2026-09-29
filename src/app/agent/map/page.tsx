'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import {
  MapPin,
  ArrowLeft,
  Navigation,
  RefreshCw,
  Home,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface AgentBooth {
  id: string;
  boothNumber: number;
  name: string;
  areaLocality: string | null;
  pollingStation: string | null;
  totalElectors: number;
  votersCount: number;
  householdsCount: number;
  verifiedHouseholdsCount: number;
  coveragePct: number;
  coverageStatus: string;
  issuesCount: number;
  hasLocation: boolean;
  statusNote?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function AgentMapPage() {
  const [booths, setBooths] = useState<AgentBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const fetchAgentBooths = async () => {
    try {
      setLoading(true);
      setError(null);

      // Find current agent profile/tasks to get campaign ID
      const tasksRes = await fetch('/api/v1/tasks', { cache: 'no-store' });
      const tasksJson = await tasksRes.json();
      
      let campId = '';
      if (tasksJson.success && tasksJson.data && tasksJson.data.length > 0) {
        campId = tasksJson.data[0].campaignId;
      }

      if (!campId) {
        // Fallback to active assignments or first campaign available
        const campRes = await fetch('/api/v1/campaigns', { cache: 'no-store' });
        const campJson = await campRes.json();
        if (campJson.success && campJson.data && campJson.data.length > 0) {
          campId = campJson.data[0].id;
        }
      }

      if (!campId) {
        setBooths([]);
        return;
      }

      setCampaignId(campId);

      const mapRes = await fetch(`/api/v1/campaigns/${campId}/map`, { cache: 'no-store' });
      const mapJson = await mapRes.json();

      if (mapJson.success) {
        const mappedList: AgentBooth[] = mapJson.data.features.map((f: any) => ({
          ...f.properties,
          longitude: f.geometry.coordinates[0],
          latitude: f.geometry.coordinates[1],
        }));
        const unmappedList: AgentBooth[] = mapJson.data.unmappedBooths;
        setBooths([...mappedList, ...unmappedList].sort((a, b) => a.boothNumber - b.boothNumber));
      } else {
        throw new Error(mapJson.error?.message || 'Failed to fetch assigned sectors');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading agent sector map');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentBooths();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base text-slate-900">Assigned Field Sectors</h1>
          </div>

          <button
            onClick={() => fetchAgentBooths()}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </header>

        <main className="flex-1 flex flex-col">
          {/* Status bar */}
          <div className="bg-slate-900 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  Assigned Geography
                </span>
                <h3 className="text-sm font-bold text-white">
                  {booths.length > 0
                    ? `${booths.length} Polling Sector${booths.length > 1 ? 's' : ''}`
                    : 'No Active Assignments'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 animate-pulse" /> SSoT Database
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-slate-100 h-28 rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && booths.length === 0 && !error && (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Booths Assigned</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                You currently have no assigned polling station sectors in this campaign. Contact your Campaign Admin for assignment.
              </p>
            </div>
          )}

          {/* Booth Sector Cards */}
          {!loading && booths.length > 0 && (
            <div className="p-4 space-y-3 flex-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Your Assigned Polling Sectors
              </h3>

              {booths.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-blue-600 font-mono">
                          Booth #{b.boothNumber}
                        </span>
                        {b.hasLocation ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            GPS Live
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Location Unset
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">{b.name}</h4>
                      <p className="text-[10px] text-slate-400">{b.areaLocality || b.pollingStation || 'Sector'}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.coverageStatus === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b.coverageStatus === 'Good'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : b.coverageStatus === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {b.coverageStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${b.coveragePct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700">{b.coveragePct}%</span>
                      <span className="text-[10px] text-slate-400">
                        ({b.verifiedHouseholdsCount}/{b.householdsCount} Homes)
                      </span>
                    </div>

                    <Link
                      href="/agent/search"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      Search Homes <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}
