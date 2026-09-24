'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function CompliantVisIssuancePage({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState('Sunita Devi');
  const [showSlipModal, setShowSlipModal] = useState(false);

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <span>Voter Data</span>
                <span>&gt;</span>
                <span className="text-slate-900 font-semibold">VIS Issuance</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Voter Information Slip (VIS)</h1>
              <p className="text-xs text-slate-500 mt-1">
                Search voter records and generate legally compliant, neutral Voter Information Slips to assist citizens with polling booth locations.
              </p>
            </div>
          </div>

          {/* Selected Voter Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 mb-6 max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Selected Voter Details</h3>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                  <User className="w-7 h-7 text-slate-300" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">Sunita Devi</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      ✓ Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Age 44 • Female • EPIC: ABC1234568</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ward 12</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Booth No. 118 (Govt. Primary School, Room 1)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Issued at 09:15 AM
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSlipModal(true)}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Neutral VIS Slip
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Accessibility className="w-3.5 h-3.5 text-blue-600" /> Mark Assistance
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Legally Neutral VIS Print Preview Modal */}
          {showSlipModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <span className="font-bold text-xs text-slate-800">Neutral Voter Slip Preview (Legal Template)</span>
                  <button onClick={() => setShowSlipModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Legally Conservative Slip Design - Zero Candidate/Party Propaganda */}
                  <div className="border-2 border-dashed border-slate-300 p-5 rounded-xl bg-white text-xs space-y-3 font-sans">
                    <div className="text-center border-b border-slate-200 pb-2">
                      <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                        Voter Information Slip
                      </h4>
                      <p className="text-[10px] text-slate-500">General Election 2026 • Unofficial Facilitation Slip</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Elector Name</span>
                        <strong className="text-slate-900">Sunita Devi</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Guardian/Spouse</span>
                        <span className="text-slate-800">Rajesh Kumar</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gender / Age</span>
                        <span className="text-slate-800">Female / 44</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">EPIC Number</span>
                        <strong className="font-mono text-slate-900">ABC1234568</strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Part / Booth No:</span>
                        <strong className="text-blue-700">Booth 118</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Serial No. in Part:</span>
                        <strong className="text-blue-700">002</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Polling Location:</span>
                        <span className="text-slate-800 font-medium">Govt. Primary School, Room 1, Ward 12</span>
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
