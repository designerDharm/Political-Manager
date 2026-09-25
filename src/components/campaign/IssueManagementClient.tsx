'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  MoreVertical,
  User,
  Send,
  X,
  RotateCw,
  Check,
  Building,
  Home,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface IssueItem {
  id: string;
  code: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string | Date;
  household?: { id: string; code: string; address?: string | null } | null;
  booth?: { id: string; boothNumber: number; name: string } | null;
  assignee?: { id: string; displayName: string } | null;
  notes?: Array<{ id: string; authorName: string; content: string; createdAt: string | Date }>;
}

export function IssueManagementClient({
  campaignId,
  initialIssues,
  users,
  booths,
  households,
}: {
  campaignId: string;
  initialIssues: IssueItem[];
  users: Array<{ id: string; displayName: string; role: string }>;
  booths: Array<{ id: string; boothNumber: number; name: string }>;
  households: Array<{ id: string; code: string; address: string }>;
}) {
  const router = useRouter();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    initialIssues.length > 0 ? initialIssues[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'timeline'>('details');

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Action states
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Add Issue Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState('Voter Data');
  const [modalPriority, setModalPriority] = useState('HIGH');
  const [modalDescription, setModalDescription] = useState('');
  const [modalHouseholdId, setModalHouseholdId] = useState(households[0]?.id || '');
  const [modalBoothId, setModalBoothId] = useState(booths[0]?.id || '');
  const [modalAssigneeId, setModalAssigneeId] = useState(users[0]?.id || '');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter issues
  const filteredIssues = initialIssues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || issue.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  const selectedIssue =
    initialIssues.find((i) => i.id === selectedIssueId) ||
    (filteredIssues.length > 0 ? filteredIssues[0] : null);

  // Quick Action: Resolve / In Progress
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Issue status updated to ${newStatus}`);
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Error updating issue');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Assign to Agent
  const handleAssign = async (assigneeId: string) => {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) throw new Error('Failed to assign issue');
      showToast('Issue assigned successfully');
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Error assigning issue');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !noteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/v1/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: noteText.trim(),
          authorName: 'Campaign Staff',
        }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNoteText('');
      showToast('Note added to issue');
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Error adding note');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Submit New Issue
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle || !modalCategory || !modalDescription) {
      setModalError('Title, Category, and Description are required.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/v1/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          title: modalTitle,
          category: modalCategory,
          priority: modalPriority,
          description: modalDescription,
          householdId: modalHouseholdId || undefined,
          boothId: modalBoothId || undefined,
          assigneeId: modalAssigneeId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to create issue');

      setIsModalOpen(false);
      setModalTitle('');
      setModalDescription('');
      showToast('Issue created successfully!');
      router.refresh();
      if (json.data?.id) setSelectedIssueId(json.data.id);
    } catch (err: any) {
      setModalError(err.message || 'Error creating issue');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-slideDown">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track, assign and resolve issues from field operations, voter interactions and campaign activities.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Issue
        </button>
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
                placeholder="Search issues by title, code, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="Voter Data">Voter Data</option>
              <option value="Verification">Verification</option>
              <option value="Water">Water</option>
              <option value="Road">Road</option>
              <option value="Electricity">Electricity</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-600 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {initialIssues.length === 0
                        ? 'No issues reported for this campaign yet. Click "+ Add Issue" to log an issue!'
                        : 'No issues match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((row, idx) => {
                    const isSelected = selectedIssue?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedIssueId(row.id)}
                        className={`transition cursor-pointer ${
                          isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          <div>{row.title}</div>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">{row.code}</span>
                        </td>
                        <td className="p-2.5 text-slate-600">{row.category}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{row.household?.code || 'General'}</td>
                        <td className="p-2.5 text-slate-600">
                          {row.booth?.boothNumber ? `Booth ${row.booth.boothNumber}` : '-'}
                        </td>
                        <td className="p-2.5 text-slate-800">{row.assignee?.displayName || 'Unassigned'}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.priority === 'HIGH' || row.priority === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {row.priority}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'OPEN'
                                ? 'bg-amber-50 text-amber-700'
                                : row.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Issue Detail Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
          {selectedIssue ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedIssue.status === 'OPEN'
                          ? 'bg-amber-50 text-amber-700'
                          : selectedIssue.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {selectedIssue.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{selectedIssue.code}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedIssue.title}</h3>
                  <p className="text-[10px] text-slate-400">
                    Created {new Date(selectedIssue.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center border-b border-slate-200 text-xs font-semibold my-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 px-2 transition ${
                    activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2 px-2 transition ${
                    activeTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Notes ({selectedIssue.notes?.length || 0})
                </button>
              </div>

              {activeTab === 'details' && (
                <div className="space-y-4 text-xs flex-1">
                  <div>
                    <h4 className="font-bold text-slate-700 mb-1 text-[11px]">Description</h4>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed text-[11px]">
                      {selectedIssue.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Category</span>
                      <span className="font-bold text-slate-800">{selectedIssue.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Priority</span>
                      <span
                        className={`font-bold ${
                          selectedIssue.priority === 'HIGH' || selectedIssue.priority === 'CRITICAL'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        ↑ {selectedIssue.priority}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Household</span>
                      <span className="font-bold text-blue-600">{selectedIssue.household?.code || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assignee</span>
                      <span className="font-bold text-slate-800">
                        {selectedIssue.assignee?.displayName || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Quick Assign</label>
                    <select
                      value={selectedIssue.assignee?.id || ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      disabled={actionLoading}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold mb-3 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.role})
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={actionLoading || selectedIssue.status === 'IN_PROGRESS'}
                        className="py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                      >
                        Mark In Progress
                      </button>
                      <button
                        onClick={() => handleStatusChange('RESOLVED')}
                        disabled={actionLoading || selectedIssue.status === 'RESOLVED'}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-3 text-xs flex-1 max-h-[300px] overflow-y-auto">
                  {selectedIssue.notes && selectedIssue.notes.length > 0 ? (
                    selectedIssue.notes.map((n) => (
                      <div key={n.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 text-[11px]">{n.authorName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{n.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">No notes recorded yet.</div>
                  )}
                </div>
              )}

              {/* Add Note Input Box */}
              <form onSubmit={handleAddNote} className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 p-2 border border-slate-200 rounded-lg bg-slate-50 text-[11px] text-slate-800"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !noteText.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">No Issue Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Select an issue from the list to view its details, timeline, and actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add New Campaign Issue</h3>
                <p className="text-xs text-slate-500">Log an issue or grievance from field or voter outreach</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Voter not found in part roll, Water supply disruption"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="Voter Data">Voter Data</option>
                    <option value="Verification">Verification</option>
                    <option value="Water">Water</option>
                    <option value="Road">Road</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Field Update">Field Update</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Linked Household
                  </label>
                  <select
                    value={modalHouseholdId}
                    onChange={(e) => setModalHouseholdId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="">General / None</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.code} - {h.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Assign To
                  </label>
                  <select
                    value={modalAssigneeId}
                    onChange={(e) => setModalAssigneeId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the issue reported by the citizen or observed in the field..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  {modalSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Issue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
