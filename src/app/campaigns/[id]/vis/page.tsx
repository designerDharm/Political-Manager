'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  Search,
  Printer,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Building,
  RotateCw,
  FileText,
  Accessibility,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

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

export default function CompliantVisIssuancePage({ params }: { params: { id: string } }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Voter[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedReference, setIssuedReference] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setIssueError(null);
      const res = await fetch(`/api/v1/voters?campaignId=${params.id}&q=${encodeURIComponent(searchQuery.trim())}&limit=20`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSearchResults(json.data || []);
        if (json.data && json.data.length > 0) {
          setSelectedVoter(json.data[0]);
        }
      }
    } catch (err: any) {
      setIssueError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleIssueVis = async (isReissue = false) => {
    if (!selectedVoter) return;

    try {
      setIssuing(true);
      setIssueError(null);
      setIssueSuccess(null);

      const res = await fetch('/api/v1/election-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isReissue ? 'VIS_REISSUE' : 'VIS_ISSUE',
          campaignId: params.id,
          voterId: selectedVoter.id,
          boothId: selectedVoter.boothId,
          isReissue,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIssueSuccess(isReissue ? 'VIS Slip Reissued' : 'VIS Slip Issued Successfully');
        setIssuedReference(json.data.referenceCode || `VIS-${selectedVoter.epicNumber}`);
        setShowSlipModal(true);
      } else {
        throw new Error(json.error?.message || 'Failed to issue VIS');
      }
    } catch (err: any) {
      setIssueError(err.message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <span>Voter Data</span>
                <span>&gt;</span>
                <span className="text-slate-900 font-semibold">VIS Issuance</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Voter Information Slip (VIS)</h1>
              <p className="text-xs text-slate-500 mt-1">
                Search voter records from PostgreSQL database and generate legally compliant, neutral Voter Information Slips to assist citizens with polling booth locations.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voter by name, EPIC number, or serial number..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {searching ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Find Voter
              </button>
            </form>
          </div>

          {issueError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{issueError}</span>
            </div>
          )}

          {/* Selected Voter Details Card */}
          {selectedVoter ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Selected Voter Details (PostgreSQL SSoT)</h3>
                <span className="font-mono text-xs text-slate-400">ID: {selectedVoter.id.substring(0, 8)}...</span>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-xs shadow-sm shrink-0">
                    <User className="w-7 h-7 text-slate-300" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{selectedVoter.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        Serial #{selectedVoter.serialNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Age {selectedVoter.age} • {selectedVoter.gender === 'M' ? 'Male' : 'Female'} • EPIC: <strong className="font-mono text-slate-700">{selectedVoter.epicNumber}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ward {selectedVoter.ward.wardNumber} ({selectedVoter.ward.name})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Booth {selectedVoter.booth.boothNumber}: {selectedVoter.booth.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={issuing}
                      onClick={() => handleIssueVis(false)}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {issuing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      Issue VIS Slip
                    </button>
                    <button
                      type="button"
                      disabled={issuing}
                      onClick={() => handleIssueVis(true)}
                      className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Reissue Slip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              Search and select an authorized voter from the database to issue a Voter Information Slip.
            </div>
          )}

          {/* Legally Neutral VIS Print Preview Modal */}
          {showSlipModal && selectedVoter && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <span className="font-bold text-xs text-slate-800">Neutral Voter Slip Preview (Legal Template)</span>
                  <button onClick={() => setShowSlipModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Conservative Slip Design - Zero Propaganda */}
                  <div className="border-2 border-dashed border-slate-300 p-5 rounded-xl bg-white text-xs space-y-3 font-sans">
                    <div className="text-center border-b border-slate-200 pb-2">
                      <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                        Voter Information Slip
                      </h4>
                      <p className="text-[10px] text-slate-500">General Election 2026 • Polling Station Facilitation</p>
                      {issuedReference && (
                        <span className="font-mono text-[9px] text-blue-700 font-bold block mt-0.5">
                          Ref: {issuedReference}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Elector Name</span>
                        <strong className="text-slate-900">{selectedVoter.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Guardian/Spouse</span>
                        <span className="text-slate-800">{selectedVoter.guardianName || 'Standard'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gender / Age</span>
                        <span className="text-slate-800">{selectedVoter.gender} / {selectedVoter.age}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">EPIC Number</span>
                        <strong className="font-mono text-slate-900">{selectedVoter.epicNumber}</strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Part / Booth No:</span>
                        <strong className="text-blue-700">Booth {selectedVoter.booth.boothNumber}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Serial No. in Part:</span>
                        <strong className="text-blue-700">#{selectedVoter.serialNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Polling Location:</span>
                        <span className="text-slate-800 font-medium">
                          {selectedVoter.booth.pollingStation || selectedVoter.booth.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-500 italic text-center pt-2 border-t border-slate-100 leading-tight">
                      * Notice: This slip is for polling station location assistance only. It is not an identity document. Please bring your EPIC or approved government photo ID on polling day.
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setShowSlipModal(false)}
                      className="flex-1 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        window.print();
                        setShowSlipModal(false);
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Slip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
