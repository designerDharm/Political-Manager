import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Home,
  CheckCircle,
  Cpu,
  User,
  MapPin,
  Edit2,
  ArrowRightLeft,
  FilePlus,
  Clock,
  MoreVertical,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export const revalidate = 0;

export default async function HouseholdDetailPage({
  params,
}: {
  params: { id: string; hid: string };
}) {
  const household = await prisma.household.findFirst({
    include: {
      members: true,
      interactions: {
        include: { agent: true },
        orderBy: { occurredAt: 'desc' },
      },
      booth: true,
    },
  });

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
          {/* Top Actions: Back & Print directly matching Voter data _.png */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/campaigns/${params.id}/voters`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Households
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print
            </button>
          </div>

          {/* Household Hero Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-card">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Household H-001</h1>
                  <p className="text-xs text-slate-500 mt-1">Ward 12 • Booth 118</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  AI Confidence: 91%
                </span>
              </div>
            </div>

            {/* Primary Contact Panel */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-20 h-24 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                <User className="w-8 h-8 text-slate-300 mb-1" />
                <span className="text-[10px] text-slate-300 font-normal">Head</span>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-semibold mb-2">
                  <User className="w-3 h-3 text-emerald-600" />
                  Primary Contact: Rajesh Kumar
                </div>
                <h3 className="text-base font-bold text-slate-900">Rajesh Kumar (48)</h3>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>House No. 12, Gandhi Nagar, Ward 12 • Near Hanuman Mandir</span>
                </div>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">Total Registered Voters: 4</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Age</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">EPIC No.</th>
                    <th className="p-3">Role in Household</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { num: 1, name: 'Rajesh Kumar', age: 48, gender: 'M', epic: 'ABC1234567', role: 'Head', roleColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { num: 2, name: 'Sunita Devi', age: 44, gender: 'F', epic: 'ABC1234568', role: 'Spouse', roleColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { num: 3, name: 'Rahul Kumar', age: 23, gender: 'M', epic: 'ABC1234569', role: 'Son', roleColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                    { num: 4, name: 'Priya Kumari', age: 20, gender: 'F', epic: 'ABC1234570', role: 'Daughter', roleColor: 'bg-purple-50 text-purple-700 border-purple-200' },
                  ].map((m) => (
                    <tr key={m.epic} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center text-slate-400 font-medium">{m.num}</td>
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3 text-slate-600">{m.age}</td>
                      <td className="p-3 text-slate-600">{m.gender}</td>
                      <td className="p-3 font-mono text-slate-700">{m.epic}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.roleColor}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button className="p-1 text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons directly matching Voter data _.png */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2">
                <Edit2 className="w-3.5 h-3.5" />
                Edit Household
              </button>
              <button className="py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                Move Voter
              </button>
              <button className="py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2">
                <FilePlus className="w-3.5 h-3.5 text-slate-500" />
                Add Note
              </button>
            </div>
          </div>

          {/* Interaction History directly matching screenshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
            <h3 className="text-base font-bold text-slate-900 mb-4">Interaction History</h3>
            <div className="space-y-4">
              {[
                { date: '18 Sep 2025', title: 'Door-to-door visit - Rajesh (Agent)', time: '10:24 AM', icon: Home, color: 'bg-blue-50 text-blue-600' },
                { date: '20 Sep 2025', title: 'Follow-up requested', time: '02:15 PM', icon: Clock, color: 'bg-amber-50 text-amber-600' },
                { date: '24 Sep 2025', title: 'Contact details verified', time: '11:40 AM', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
                { date: '26 Sep 2025', title: 'Met candidate', time: '04:05 PM', icon: User, color: 'bg-purple-50 text-purple-600' },
              ].map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div key={i} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.title}</span>
                        <span className="text-slate-400 text-[11px]">{item.date}</span>
                      </div>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
