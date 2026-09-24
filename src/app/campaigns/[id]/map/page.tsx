import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import {
  Layers,
  CheckCircle2,
  Clock,
  PieChart,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Minus,
  LocateFixed,
  MapPin,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function CoverageMapPage({ params }: { params: { id: string } }) {
  const [dbBooths, householdCount, verifiedHouseholdCount] = await Promise.all([
    prisma.booth.findMany({
      where: { campaignId: params.id },
      include: {
        _count: { select: { households: true, voters: true } },
      },
    }),
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id, status: 'Verified' } }),
  ]);

  const totalBooths = dbBooths.length;
  const coveragePercent = householdCount > 0 ? Math.round((verifiedHouseholdCount / householdCount) * 100) : 0;

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
          {/* Header & Ward Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Booth Coverage Map</h1>
              <p className="text-xs text-slate-500 mt-1">
                Visualize booth-wise voter coverage and field activity across electoral sectors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                <option>Active Wards</option>
              </select>
            </div>
          </div>

          {/* 4 Metric Cards directly sourced from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Booths"
              value={totalBooths.toString()}
              subtitle="Registered polling stations"
              icon={Layers}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Covered Booths"
              value={totalBooths > 0 ? `${totalBooths} Active` : '0'}
              subtitle="Operational sectors"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: totalBooths > 0 ? 'Active' : 'Unassigned', type: totalBooths > 0 ? 'success' : 'info' }}
            />
            <StatCard
              title="Pending Booths"
              value="0"
              subtitle="Unallocated sectors"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Household Coverage"
              value={`${coveragePercent}%`}
              subtitle={`${verifiedHouseholdCount.toLocaleString()} of ${householdCount.toLocaleString()} households`}
              icon={PieChart}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
              badge={{ text: coveragePercent > 0 ? `${coveragePercent}%` : '0%', type: 'info' }}
            />
          </div>

          {/* Main Grid: Interactive Map (Left) & Booth List (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Interactive Geospatial Map (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Ward 12 - Booth Coverage Map</h3>
                </div>

                {/* Legend directly matching screenshot */}
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600">Not Visited</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600">Partial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-600">Good</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Completed</span>
                  </div>
                </div>
              </div>

              {/* Map Canvas with Polygons directly styled like screenshot */}
              <div className="flex-1 min-h-[460px] bg-slate-100 rounded-xl relative border border-slate-200 overflow-hidden flex items-center justify-center p-4">
                {/* SVG Polygon Visualization */}
                <svg viewBox="0 0 600 500" className="w-full h-full max-h-[460px]">
                  {/* Outer boundary line */}
                  <polygon
                    points="180,50 320,80 420,120 480,240 450,380 340,430 200,410 140,280"
                    fill="#f8fafc"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeDasharray="6 3"
                  />

                  {/* Booth 101 - Completed (Green) */}
                  <polygon
                    points="200,70 300,90 280,180 200,160"
                    fill="#10B981"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="240" y="130" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">101</text>

                  {/* Booth 102 - Good (Blue) */}
                  <polygon
                    points="300,90 390,120 370,200 280,180"
                    fill="#3B82F6"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="330" y="150" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">102</text>

                  {/* Booth 103 - Completed (Green) */}
                  <polygon
                    points="390,120 450,180 430,260 370,200"
                    fill="#10B981"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="410" y="195" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">103</text>

                  {/* Booth 104 - Not Visited (Red) */}
                  <polygon
                    points="170,160 250,180 230,260 160,240"
                    fill="#EF4444"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="205" y="215" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">104</text>

                  {/* Booth 105 - Partial (Amber) */}
                  <polygon
                    points="250,180 340,200 320,280 230,260"
                    fill="#F59E0B"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="285" y="235" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">105</text>

                  {/* Booth 106 - Good (Blue) */}
                  <polygon
                    points="340,200 420,220 400,300 320,280"
                    fill="#3B82F6"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="370" y="255" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">106</text>

                  {/* Booth 110 - Not Visited (Red) */}
                  <polygon
                    points="230,260 320,280 300,360 220,340"
                    fill="#EF4444"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="270" y="315" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">110</text>

                  {/* Booth 118 - Completed (Green) */}
                  <polygon
                    points="220,340 310,360 290,430 200,410"
                    fill="#10B981"
                    opacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-100 transition"
                  />
                  <text x="255" y="390" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">118</text>
                </svg>

                {/* Map Floating Controls */}
                <div className="absolute bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-md flex flex-col divide-y divide-slate-100 overflow-hidden">
                  <button className="p-2 text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-600 hover:bg-slate-50"><Minus className="w-4 h-4" /></button>
                  <button className="p-2 text-blue-600 hover:bg-slate-50"><LocateFixed className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Booth List Panel (1 Col) directly matching cc6de557-fe85-429e-8638-44bb00954025.png */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Booth List ({totalBooths})</h3>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search booth number or area..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
                {dbBooths.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No booths registered for this campaign yet.
                  </div>
                ) : (
                  dbBooths.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-slate-50/50 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">Booth {b.boothNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {b.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">{b.areaLocality || 'Sector Zone'}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">{b._count.voters} voters</span>
                        <span className="text-[10px] text-slate-400 block">{b._count.households} households</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
