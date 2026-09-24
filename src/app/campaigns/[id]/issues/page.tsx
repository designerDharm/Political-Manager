import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  User,
  MessageSquare,
  Calendar,
  Send,
} from 'lucide-react';

export const revalidate = 0;

export default async function IssueManagementPage({ params }: { params: { id: string } }) {
  const issues = await prisma.issue.findMany({
    include: {
      household: true,
      booth: true,
      assignee: true,
      notes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const resolvedIssues = issues.filter((i) => i.status === 'RESOLVED').length;
  const highPriority = issues.filter((i) => i.priority === 'HIGH' || i.priority === 'CRITICAL').length;

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Management</h1>
              <p className="text-xs text-slate-500 mt-1">
                Track, assign and resolve issues from field operations, voter interactions and campaign activities.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Issue
            </button>
          </div>

          {/* 4 Metric Cards directly sourced from database */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Issues"
              value={totalIssues.toLocaleString()}
              subtitle="All reported issues"
              icon={AlertCircle}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Open Issues"
              value={openIssues.toLocaleString()}
              subtitle="Require attention"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              badge={{ text: openIssues > 0 ? 'Pending' : 'All Clear', type: openIssues > 0 ? 'warning' : 'success' }}
            />
            <StatCard
              title="Resolved Issues"
              value={resolvedIssues.toLocaleString()}
              subtitle="Successfully closed"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Resolved', type: 'success' }}
            />
            <StatCard
              title="High Priority"
              value={highPriority.toLocaleString()}
              subtitle="Critical issues"
              icon={AlertTriangle}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
              badge={{ text: highPriority > 0 ? 'Critical' : 'None', type: highPriority > 0 ? 'danger' : 'success' }}
            />
          </div>

          {/* Grid Layout: Left Table (2 cols) & Right Issue Detail Drawer (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Issue Table (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Categories</option>
                  <option>Voter Data</option>
                  <option>Verification</option>
                  <option>Water</option>
                  <option>Road</option>
                </select>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Statuses</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
                <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600">
                  <option>All Priorities</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Issue Title</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Household</th>
                      <th className="p-2.5">Booth</th>
                      <th className="p-2.5">Assignee</th>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { num: 1, title: 'Voter not found in list', cat: 'Voter Data', hh: 'H-001', booth: '118', assignee: 'Rajesh Kumar', priority: 'High', status: 'Open' },
                      { num: 2, title: 'Address verification required', cat: 'Verification', hh: 'H-045', booth: '112', assignee: 'Sunita Devi', priority: 'Medium', status: 'Open' },
                      { num: 3, title: 'Duplicate entry in database', cat: 'Data Issue', hh: 'H-128', booth: '105', assignee: 'Amit Singh', priority: 'High', status: 'Resolved' },
                      { num: 4, title: 'Voter moved out', cat: 'Field Update', hh: 'H-210', booth: '118', assignee: 'Priya Kumari', priority: 'Medium', status: 'In Progress' },
                      { num: 5, title: 'Water supply interruption reported', cat: 'Water', hh: 'H-316', booth: '109', assignee: 'Rakesh Verma', priority: 'Medium', status: 'Open' },
                    ].map((row) => (
                      <tr key={row.num} className="hover:bg-slate-50 transition cursor-pointer">
                        <td className="p-2.5 text-center text-slate-400">{row.num}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.title}</td>
                        <td className="p-2.5 text-slate-600">{row.cat}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{row.hh}</td>
                        <td className="p-2.5 text-slate-600">{row.booth}</td>
                        <td className="p-2.5 text-slate-800">{row.assignee}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {row.priority}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'Open'
                                ? 'bg-amber-50 text-amber-700'
                                : row.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {row.status}
                          </span>
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

            {/* Right Issue Detail Card directly matching c19c3e78-7ee8-4b10-a5dd-96dcfdfd5d6b.png */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                      Open
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">#ISS-2025-001</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">Voter not found in list</h3>
                  <p className="text-[10px] text-slate-400">Reported 2 hours ago</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center border-b border-slate-200 text-xs font-semibold my-4">
                <button className="pb-2 border-b-2 border-blue-600 text-blue-600 px-2">Details</button>
                <button className="pb-2 text-slate-500 hover:text-slate-800 px-2">Timeline</button>
                <button className="pb-2 text-slate-500 hover:text-slate-800 px-2">Notes (3)</button>
                <button className="pb-2 text-slate-500 hover:text-slate-800 px-2">Follow-ups</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-700 mb-1 text-[11px]">Description</h4>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed text-[11px]">
                    Voter claims to be a long-time resident but not found in our current voter list. Needs verification and possible addition to database.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Category</span>
                    <span className="font-bold text-slate-800">Voter Data</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Priority</span>
                    <span className="font-bold text-rose-600">↑ High</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Household</span>
                    <span className="font-bold text-blue-600">H-001</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assignee</span>
                    <span className="font-bold text-slate-800">Rajesh Kumar</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button className="py-2 bg-blue-600 text-white rounded-lg font-bold text-[11px] shadow-sm">
                    Assign
                  </button>
                  <button className="py-2 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-sm">
                    Resolve
                  </button>
                  <button className="py-2 border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px]">
                    Follow-up
                  </button>
                </div>

                {/* Add Note Input Box */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add a note..."
                    className="flex-1 p-2 border border-slate-200 rounded-lg bg-slate-50 text-[11px]"
                  />
                  <button className="p-2 bg-blue-600 text-white rounded-lg">
                    <Send className="w-3.5 h-3.5" />
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
