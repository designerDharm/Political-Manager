'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  Users,
  Home,
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check,
  Eye,
  Edit,
  Trash2,
  X,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface VoterItem {
  id: string;
  serialNumber: number;
  name: string;
  guardianName?: string | null;
  age: number;
  gender: string;
  epicNumber: string;
  houseNumber: string;
  status: string;
  verificationStatus?: string | null;
  phone?: string | null;
  roleInHousehold?: string | null;
  household?: {
    id: string;
    code: string;
    address: string;
  } | null;
  booth?: {
    name: string;
    boothNumber: number;
  } | null;
}

export default function VoterListClient({
  campaignId,
  initialVoters,
  totalVotersCount,
  totalHouseholdsCount,
  processedVotersCount,
  activeWardName,
}: {
  campaignId: string;
  initialVoters: VoterItem[];
  totalVotersCount: number;
  totalHouseholdsCount: number;
  processedVotersCount: number;
  activeWardName: string;
}) {
  const router = useRouter();
  const [voters, setVoters] = useState<VoterItem[]>(initialVoters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedVoter, setSelectedVoter] = useState<VoterItem | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    age: 0,
    gender: 'M',
    houseNumber: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter voters in-memory or dynamically
  const filteredVoters = voters.filter((v) => {
    const matchesGender =
      selectedGender === 'All' ||
      (selectedGender === 'Male' && v.gender === 'M') ||
      (selectedGender === 'Female' && v.gender === 'F') ||
      (selectedGender === 'Others' && v.gender !== 'M' && v.gender !== 'F');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.epicNumber.toLowerCase().includes(q) ||
      v.houseNumber.toLowerCase().includes(q) ||
      (v.household?.code && v.household.code.toLowerCase().includes(q));

    return matchesGender && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVoters.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedVoters = filteredVoters.slice(startIndex, startIndex + pageSize);

  const processedPercent =
    totalVotersCount > 0 ? Math.round((processedVotersCount / totalVotersCount) * 100) : 100;

  const handleEditClick = (voter: VoterItem) => {
    setSelectedVoter(voter);
    setEditFormData({
      name: voter.name,
      phone: voter.phone || '',
      age: voter.age,
      gender: voter.gender,
      houseNumber: voter.houseNumber,
    });
    setActionMenuOpenId(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoter) return;

    try {
      const res = await fetch(`/api/v1/voters/${selectedVoter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update voter');

      setVoters(
        voters.map((v) => (v.id === selectedVoter.id ? { ...v, ...editFormData } : v))
      );
      setFeedback({ type: 'success', message: `Voter ${editFormData.name} updated successfully in database SSoT.` });
      setIsEditModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating voter' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete voter record for ${name}?`)) return;
    try {
      const res = await fetch(`/api/v1/voters/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete voter');

      setVoters(voters.filter((v) => v.id !== id));
      setActionMenuOpenId(null);
      setFeedback({ type: 'success', message: `Voter ${name} deleted successfully.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error deleting voter');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={campaignId} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                Voter Data
              </span>
              <span>&gt;</span>
              <span className="text-slate-900 font-semibold">Voter List</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{activeWardName}</span>
              </div>
            </div>
          </div>

          {/* Title & Subtitle + Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Voters - {activeWardName} (AI Processed)</h1>
              <p className="text-xs text-slate-500 mt-1">
                View, filter, edit, and inspect AI-processed voters with dynamic household mapping and live interaction links.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/v1/campaigns/${campaignId}/reports?type=OPERATIONAL_SUMMARY&format=CSV`}
                download
                className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Export electoral summary to CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </a>
              <Link
                href={`/campaigns/${campaignId}/households`}
                className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>Households</span>
              </Link>
              <Link
                href={`/campaigns/${campaignId}/imports/review`}
                className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>AI Review Center</span>
              </Link>
              <Link
                href={`/campaigns/${campaignId}/voters/upload`}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Upload Voter List</span>
              </Link>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 mb-6 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Total Voters</span>
                <span className="text-2xl font-bold text-slate-900">{totalVotersCount.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Households</span>
                <span className="text-2xl font-bold text-slate-900">{totalHouseholdsCount.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Processed</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">{processedVotersCount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-medium">({processedPercent}%)</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-600">
                {processedPercent}%
              </div>
            </div>
          </div>

          {/* Search, Gender Filters, and Filter Button */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, EPIC, house number, household ID..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Gender Segment Buttons */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
                {['All', 'Male', 'Female', 'Others'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGender(g)}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      selectedGender === g
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Voter Data Table */}
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
                  {paginatedVoters.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        <p className="font-semibold text-sm text-slate-700">No voters matching query.</p>
                        <p className="text-xs text-slate-400 mt-1">Try resetting filters or uploading new voter records.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedVoters.map((voter) => (
                      <tr key={voter.id} className="hover:bg-slate-50/80 transition relative">
                        <td className="p-3.5 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-500">{voter.serialNumber}</td>
                        <td className="p-3.5 font-bold text-slate-900">{voter.name}</td>
                        <td className="p-3.5 text-slate-600">{voter.age}</td>
                        <td className="p-3.5 text-slate-600">{voter.gender}</td>
                        <td className="p-3.5 font-mono text-slate-700 font-semibold">{voter.epicNumber}</td>
                        <td className="p-3.5 text-slate-600">{voter.houseNumber}</td>
                        <td className="p-3.5">
                          {voter.household ? (
                            <Link
                              href={`/campaigns/${campaignId}/households/${voter.household.id || voter.household.code}`}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{voter.household.code || 'Assigned'}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-medium italic">Unassigned</span>
                          )}
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
                        <td className="p-3.5 text-right relative">
                          <div className="inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuOpenId(actionMenuOpenId === voter.id ? null : voter.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpenId === voter.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 text-xs text-left animate-in fade-in zoom-in-95">
                                {voter.household ? (
                                  <Link
                                    href={`/campaigns/${campaignId}/households/${voter.household.id || voter.household.code}`}
                                    className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Home className="w-3.5 h-3.5 text-blue-600" />
                                    <span>View Household</span>
                                  </Link>
                                ) : (
                                  <div className="w-full px-3.5 py-2 text-slate-400 flex items-center gap-2 cursor-not-allowed">
                                    <Home className="w-3.5 h-3.5 text-slate-300" />
                                    <span>No Household</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(voter)}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(voter.id, voter.name)}
                                  className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete Record</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls directly matching screenshot */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <span>
                Showing {filteredVoters.length === 0 ? 0 : startIndex + 1} to{' '}
                {Math.min(startIndex + pageSize, filteredVoters.length)} of{' '}
                {filteredVoters.length.toLocaleString()} voters
              </span>

              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage === 1}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-bold transition shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-sm ${
                        validCurrentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-blue-500/30'
                          : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-bold transition shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Voter Modal */}
          {isEditModalOpen && selectedVoter && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Edit Elector: {selectedVoter.name}</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Elector Full Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Gender</label>
                      <select
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="O">Other (O)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">House Number</label>
                      <input
                        type="text"
                        value={editFormData.houseNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, houseNumber: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
