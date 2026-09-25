import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Users,
  Home,
  CheckCircle2,
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';

export const revalidate = 0;

export default async function VoterListPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { q?: string; gender?: string; ward?: string };
}) {
  const [totalVoters, totalHouseholds, processedCount, voters, campaignWards] = await Promise.all([
    prisma.voter.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.voter.count({ where: { campaignId: params.id, status: 'Processed' } }),
    prisma.voter.findMany({
      where: { campaignId: params.id },
      take: 25,
      orderBy: { serialNumber: 'asc' },
      include: {
        household: true,
        ward: true,
        booth: true,
      },
    }),
    prisma.ward.findMany({ where: { campaignId: params.id } }),
  ]);

  const activeWardName = campaignWards[0]?.name || 'Ward 12';
  const processedPercent = totalVoters > 0 ? Math.round((processedCount / totalVoters) * 100) : 100;

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
          {/* Breadcrumb directly matching Voter data _ voter list.png */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                Voter Data
              </span>
              <span>&gt;</span>
              <span className="text-slate-900 font-semibold">Voter List</span>
            </div>

            {/* Ward Selector Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{activeWardName}</span>
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Voters - {activeWardName} (AI Processed)</h1>
            <p className="text-xs text-slate-500 mt-1">
              View and manage the AI-processed voter list with household mapping and verification status.
            </p>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Total Voters</span>
                <span className="text-2xl font-bold text-slate-900">{totalVoters.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Households</span>
                <span className="text-2xl font-bold text-slate-900">{totalHouseholds.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Processed</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">{processedCount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-medium">({processedPercent}%)</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-600">
                {processedPercent}%
              </div>
            </div>
          </div>

          {/* Search, Gender Filters, and Filter Button directly matching screenshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, EPIC, house number, household ID..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Gender Segment Buttons */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
                <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white shadow-sm">All</button>
                <button className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900">Male</button>
                <button className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900">Female</button>
                <button className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900">Others</button>
              </div>

              {/* Filter Button */}
              <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Voter Data Table directly matching Voter data _ voter list.png */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Age</th>
                    <th className="p-3.5">Gender</th>
                    <th className="p-3.5">EPIC No.</th>
                    <th className="p-3.5">House No.</th>
                    <th className="p-3.5">Household ID</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {voters.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        <p className="font-semibold text-sm text-slate-700">No voters found in database yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Upload Electoral Roll PDF/CSV in Ingestion Center and click Publish.</p>
                        <Link
                          href={`/campaigns/${params.id}/voters/upload`}
                          className="mt-3 inline-block py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Go to Upload Center
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    voters.map((voter) => (
                      <tr key={voter.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-500">{voter.serialNumber}</td>
                        <td className="p-3.5 font-bold text-slate-900">{voter.name}</td>
                        <td className="p-3.5 text-slate-600">{voter.age}</td>
                        <td className="p-3.5 text-slate-600">{voter.gender}</td>
                        <td className="p-3.5 font-mono text-slate-700">{voter.epicNumber}</td>
                        <td className="p-3.5 text-slate-600">{voter.houseNumber}</td>
                        <td className="p-3.5">
                          <Link
                            href={`/campaigns/${params.id}/households/${voter.household?.id || 'H-001'}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {voter.household?.code || 'H-001'}
                          </Link>
                        </td>
                        <td className="p-3.5">
                          {voter.status === 'Processed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <span>Showing 1 to {voters.length} of {totalVoters.toLocaleString()} voters</span>

              <div className="flex items-center gap-2">
                <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-slate-50">
                  <option>10 per page</option>
                  <option>25 per page</option>
                  <option>50 per page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-400">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">1</button>
                  <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">2</button>
                  <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">3</button>
                  <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">4</button>
                  <span>...</span>
                  <button className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">284</button>
                  <button className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
