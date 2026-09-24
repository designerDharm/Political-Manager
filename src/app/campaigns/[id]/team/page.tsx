import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  UsersRound,
  ShieldAlert,
  Building,
  UserCheck,
  Search,
  Filter,
  Plus,
  Mail,
  MoreVertical,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const revalidate = 0;

export default async function TeamManagementPage({ params }: { params: { id: string } }) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
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
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage your campaign team, assign areas, and track field operations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Invite Member
              </button>
              <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Add Team Member
              </button>
            </div>
          </div>

          {/* 4 Metric Cards directly matching 1ee65c9e-e416-4965-8287-43d031225e0a.png */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Team Members"
              value="42"
              subtitle="+6 this month"
              icon={UsersRound}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Campaign Admins"
              value="4"
              subtitle="Authorized leaders"
              icon={ShieldAlert}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Booth Managers"
              value="12"
              subtitle="Supervising booths"
              icon={Building}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Political Agents"
              value="26"
              subtitle="Active field workers"
              icon={UserCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
            />
          </div>

          {/* Main Grid: Left Table (2 cols) & Right Assignment Panel (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Team Members List (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Team Members</h3>
                </div>

                <div className="flex items-center gap-2">
                  <select className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 text-slate-700">
                    <option>All Roles</option>
                    <option>Campaign Admin</option>
                    <option>Booth Manager</option>
                    <option>Political Agent</option>
                  </select>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, role..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Wards</option>
                  <option>Ward 12</option>
                  <option>Ward 13</option>
                </select>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Booths</option>
                  <option>Booth 101</option>
                  <option>Booth 118</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Phone Number</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Ward / Booth</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { num: 1, name: 'Amit Kumar', phone: '+91 98765 43210', role: 'Campaign Admin', roleColor: 'bg-blue-50 text-blue-700', area: 'All Wards', status: 'Active' },
                      { num: 2, name: 'Priya Singh', phone: '+91 98765 43211', role: 'Booth Manager', roleColor: 'bg-amber-50 text-amber-700', area: 'Ward 12, Booth 101', status: 'Active' },
                      { num: 3, name: 'Rakesh Yadav', phone: '+91 98765 43212', role: 'Political Agent', roleColor: 'bg-emerald-50 text-emerald-700', area: 'Ward 12, Booth 118', status: 'Active' },
                      { num: 4, name: 'Sunita Devi', phone: '+91 98765 43213', role: 'Political Agent', roleColor: 'bg-emerald-50 text-emerald-700', area: 'Ward 12, Booth 102', status: 'Active' },
                      { num: 5, name: 'Mahesh Singh', phone: '+91 98765 43214', role: 'Booth Manager', roleColor: 'bg-amber-50 text-amber-700', area: 'Ward 13, Booth 201', status: 'Active' },
                      { num: 6, name: 'Neha Sharma', phone: '+91 98765 43215', role: 'Political Agent', roleColor: 'bg-emerald-50 text-emerald-700', area: 'Ward 13, Booth 201', status: 'Inactive' },
                    ].map((row) => (
                      <tr key={row.num} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 text-center text-slate-400">{row.num}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.phone}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.roleColor}`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{row.area}</td>
                        <td className="p-2.5">
                          {row.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-semibold text-[11px]">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-600">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Assignment Panel directly matching 1ee65c9e-e416-4965-8287-43d031225e0a.png */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign Areas to Agent</h3>
                  <p className="text-[11px] text-slate-500">Assign wards, booths or households to a field agent.</p>
                </div>
              </div>

              <form className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Select Agent <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold">
                    <option>Rakesh Yadav (Political Agent)</option>
                    <option>Sunita Devi (Political Agent)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Assignment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button type="button" className="py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50">
                      Ward
                    </button>
                    <button type="button" className="py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-sm">
                      Booth
                    </button>
                    <button type="button" className="py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50">
                      Households
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Select Ward <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50">
                      <option>Ward 12</option>
                      <option>Ward 13</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Select Booth <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50">
                      <option>Booth 101</option>
                      <option>Booth 118</option>
                    </select>
                  </div>
                </div>

                {/* Selected Area Summary Box */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-blue-900 block text-[11px]">Selected Area</span>
                      <span className="text-blue-700 text-[10px]">Ward 12 &gt; Booth 101 (248 Households)</span>
                    </div>
                  </div>
                  <button type="button" className="text-[10px] text-blue-700 font-bold hover:underline">
                    View
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Task Type <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                    <option>Voter Outreach & Verification</option>
                    <option>Voter Information Slip (VIS) Delivery</option>
                    <option>Follow-up Resolution</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Assignment Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add specific instructions for this assignment..."
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md shadow-blue-500/25 transition text-xs mt-2"
                >
                  Assign to Agent
                </button>
              </form>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
