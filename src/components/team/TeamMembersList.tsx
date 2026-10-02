'use client';

import React, { useState } from 'react';
import { UsersRound, Search, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { formatBoothLabel } from '@/lib/formatting';

export interface TeamMemberItem {
  id: string;
  displayName: string;
  phone: string | null;
  email: string;
  role: string;
  status: string;
  assignments: Array<{ scopeType: string; scopeTarget: string }>;
}

export function TeamMembersList({
  users,
  wards,
  booths,
}: {
  users: TeamMemberItem[];
  wards: Array<{ id: string; name: string }>;
  booths: Array<{ id: string; name: string; boothNumber: number }>;
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [boothFilter, setBoothFilter] = useState('ALL');

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      u.displayName.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'CAMPAIGN_ADMIN' && (u.role === 'CAMPAIGN_ADMIN' || u.role === 'SUPER_ADMIN')) ||
      (roleFilter === 'BOOTH_MANAGER' && u.role === 'BOOTH_MANAGER') ||
      (roleFilter === 'POLITICAL_AGENT' && (u.role === 'POLITICAL_AGENT' || u.role === 'AGENT'));

    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    const matchesWard =
      wardFilter === 'ALL' ||
      u.assignments.some(
        (a) => a.scopeTarget.includes(wardFilter) || (a.scopeType === 'WARD' && a.scopeTarget.includes(wardFilter))
      );

    const matchesBooth =
      boothFilter === 'ALL' ||
      u.assignments.some(
        (a) => a.scopeTarget.includes(boothFilter) || (a.scopeType === 'BOOTH' && a.scopeTarget.includes(boothFilter))
      );

    return matchesSearch && matchesRole && matchesStatus && matchesWard && matchesBooth;
  });

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Team Members</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {filteredUsers.length} of {users.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value="CAMPAIGN_ADMIN">Campaign Admin</option>
            <option value="BOOTH_MANAGER">Booth Manager</option>
            <option value="POLITICAL_AGENT">Political Agent</option>
          </select>
        </div>
      </div>

      {/* Dynamic Filters from active campaign */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, role..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600"
        >
          <option value="ALL">All Wards</option>
          {wards.map((w) => (
            <option key={w.id} value={w.name}>{w.name}</option>
          ))}
        </select>
        <select
          value={boothFilter}
          onChange={(e) => setBoothFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600"
        >
          <option value="ALL">All Booths</option>
          {booths.map((b) => (
            <option key={b.id} value={`Booth ${b.boothNumber}`}>
              {formatBoothLabel(b.boothNumber, b.name)}
            </option>
          ))}
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  {users.length === 0 ? 'No team members registered yet in this campaign.' : 'No team members match the selected filters.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => {
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
  );
}
