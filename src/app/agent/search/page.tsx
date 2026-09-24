'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import {
  Search,
  ArrowLeft,
  User,
  Home,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function AgentSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const mockVoters = [
    { id: 'v-01', name: 'Rajesh Kumar', epic: 'ABC1234567', household: 'H-001', booth: '101', status: 'Verified' },
    { id: 'v-02', name: 'Sunita Devi', epic: 'ABC1234568', household: 'H-001', booth: '101', status: 'Verified' },
    { id: 'v-03', name: 'Rahul Kumar', epic: 'ABC1234569', household: 'H-001', booth: '101', status: 'Verified' },
    { id: 'v-04', name: 'Priya Kumari', epic: 'ABC1234570', household: 'H-001', booth: '101', status: 'Verified' },
    { id: 'v-05', name: 'Amit Sharma', epic: 'DEF9876543', household: 'H-002', booth: '102', status: 'Pending' },
    { id: 'v-06', name: 'Pooja Sharma', epic: 'DEF9876544', household: 'H-002', booth: '102', status: 'Pending' },
  ];

  const filtered = mockVoters.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.epic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.household.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header with Search Input */}
        <header className="p-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-20 space-y-3">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base text-slate-900">Search Electors & Homes</h1>
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

        <main className="p-4 flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{filtered.length} Results found</span>
            <span className="font-mono text-[10px]">Booth #101 / #102 Scope</span>
          </div>

          <div className="space-y-2">
            {filtered.map((v) => (
              <Link
                key={v.id}
                href="/agent/visit/H-001"
                className="p-3 border border-slate-100 rounded-xl bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition flex items-center justify-between block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {v.name.slice(0, 1)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{v.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      EPIC: {v.epic} • {v.household}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    v.status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {v.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}
