import React from 'react';
import Link from 'next/link';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import {
  MapPin,
  ArrowLeft,
  Navigation,
  Compass,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function AgentMapPage() {
  const mapBooths = [
    { num: '101', name: 'Gandhi Nagar Primary School', coverage: 82, status: 'Active Sector', lat: '28.6139', lng: '77.2090' },
    { num: '102', name: 'Community Center Sector 4', coverage: 65, status: 'Next Sector', lat: '28.6145', lng: '77.2105' },
    { num: '103', name: 'Municipal Ward Office Hall', coverage: 90, status: 'Completed', lat: '28.6152', lng: '77.2081' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base text-slate-900">Field Sector Map</h1>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <Navigation className="w-2.5 h-2.5 animate-pulse" /> GPS Active
          </span>
        </header>

        <main className="flex-1 flex flex-col">
          {/* Simulated Mobile Map Canvas */}
          <div className="h-64 bg-slate-100 border-b border-slate-200 relative flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 400 250" className="w-full h-full opacity-60">
              <rect width="400" height="250" fill="#f8fafc" />
              <path d="M 20 50 Q 150 80 200 40 T 380 90" stroke="#cbd5e1" strokeWidth="6" fill="none" />
              <path d="M 60 220 Q 180 180 240 210 T 360 170" stroke="#cbd5e1" strokeWidth="8" fill="none" />
              <path d="M 120 20 L 140 240" stroke="#e2e8f0" strokeWidth="4" fill="none" />
              <path d="M 260 10 L 280 230" stroke="#e2e8f0" strokeWidth="4" fill="none" />
              <circle cx="160" cy="110" r="14" fill="#3B82F6" fillOpacity="0.2" />
              <circle cx="160" cy="110" r="6" fill="#2563EB" />
              <circle cx="270" cy="80" r="14" fill="#10B981" fillOpacity="0.2" />
              <circle cx="270" cy="80" r="6" fill="#059669" />
              <circle cx="90" cy="170" r="14" fill="#F59E0B" fillOpacity="0.2" />
              <circle cx="90" cy="170" r="6" fill="#D97706" />
            </svg>

            {/* Current GPS marker badge */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono shadow-sm">
              <span className="font-bold text-slate-800">Your Location:</span> Ward 12 • Booth #101
            </div>
          </div>

          {/* Booth Sector Cards */}
          <div className="p-4 space-y-3 flex-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Nearby Booth Sectors</h3>

            {mapBooths.map((b) => (
              <div
                key={b.num}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-blue-400 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 font-mono">Booth #{b.num}</span>
                    <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {b.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${b.coverage}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">{b.coverage}%</span>
                  </div>

                  <Link
                    href="/agent/visit/H-001"
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    View Homes →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}
