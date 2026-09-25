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

import { AssignAreaForm } from '@/components/team/AssignAreaForm';
import { AddTeamMemberModal } from '@/components/team/AddTeamMemberModal';

export const revalidate = 0;

export default async function TeamManagementPage({ params }: { params: { id: string } }) {
  const [users, wards, booths, assignments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assignments: { where: { campaignId: params.id } } },
    }),
    prisma.ward.findMany({ where: { campaignId: params.id } }),
    prisma.booth.findMany({ where: { campaignId: params.id } }),
    prisma.assignment.findMany({ where: { campaignId: params.id } }),
  ]);

  const totalMembers = users.length;
  const adminCount = users.filter((u) => u.role === 'CAMPAIGN_ADMIN' || u.role === 'SUPER_ADMIN').length;
  const boothManagerCount = users.filter((u) => u.role === 'BOOTH_MANAGER').length;
  const agentCount = users.filter((u) => u.role === 'POLITICAL_AGENT' || u.role === 'AGENT').length;

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
              <AddTeamMemberModal campaignId={params.id} />
            </div>
          </div>


          {/* 4 Metric Cards directly sourced from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Team Members"
              value={totalMembers.toString()}
              subtitle="Active staff & agents"
              icon={UsersRound}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Campaign Admins"
              value={adminCount.toString()}
              subtitle="Authorized leaders"
              icon={ShieldAlert}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Booth Managers"
              value={boothManagerCount.toString()}
              subtitle="Supervising booths"
              icon={Building}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Political Agents"
              value={agentCount.toString()}
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
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No team members registered yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((u, idx) => {
                        const userAssignments = u.assignments || [];
                        const areaText = userAssignments.length > 0
                          ? userAssignments.map((a: any) => `${a.scopeType}: ${a.scopeTarget}`).join(', ')
                          : 'Unassigned';

                        const roleColor =
                          u.role === 'CAMPAIGN_ADMIN' || u.role === 'SUPER_ADMIN'
                            ? 'bg-blue-50 text-blue-700'
                            : u.role === 'BOOTH_MANAGER'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{u.displayName}</td>
                            <td className="p-2.5 font-mono text-slate-600">{u.phone || u.email}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleColor}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">{areaText}</td>
                            <td className="p-2.5">
                              {u.status === 'ACTIVE' ? (
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Assignment Panel directly matching 1ee65c9e-e416-4965-8287-43d031225e0a.png */}
            <AssignAreaForm
              campaignId={params.id}
              users={users.map((u) => ({ id: u.id, displayName: u.displayName, role: u.role }))}
              wards={wards.map((w) => ({ id: w.id, name: w.name }))}
              booths={booths.map((b) => ({ id: b.id, name: b.name, boothNumber: b.boothNumber }))}
            />

          </div>
        </main>
      </div>
    </div>
  );
}
