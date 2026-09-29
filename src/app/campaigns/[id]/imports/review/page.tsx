'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  Layers,
  ArrowRight,
  Eye,
  Users,
  Copy,
  Home,
  CheckSquare,
  Edit2
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ImportReviewCenterPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get('jobId') || '';

  const [activeTab, setActiveTab] = useState<'pages' | 'records' | 'lowConfidence' | 'duplicates'>('records');
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState(initialJobId);
  const [importJob, setImportJob] = useState<any>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    TOTAL: 0,
    VALID: 0,
    LOW_CONFIDENCE: 0,
    DUPLICATE_SUSPECT: 0,
    INVALID: 0,
    PUBLISHED: 0,
  });
  const [records, setRecords] = useState<any[]>([]);
  const [recordsFilter, setRecordsFilter] = useState<'ALL' | 'LOW_CONFIDENCE' | 'DUPLICATE_SUSPECT' | 'VALID'>('ALL');

  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [error, setError] = useState('');

  // Editing state for staged record
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    relationName: '',
    relationType: 'FATHER',
    houseNumber: '',
    age: 18,
    gender: 'M',
    epicNumber: '',
  });

  const fetchJobDetails = async (targetJobId: string, filter = recordsFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/imports/${targetJobId}?status=${filter}&limit=100`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch import job');

      setImportJob(json.data.importJob);
      setStatusCounts(json.data.statusCounts);
      setRecords(json.data.records);
    } catch (err: any) {
      setError(err.message || 'Error loading job details');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestOrSpecificJob = async () => {
    try {
      if (initialJobId) {
        setJobId(initialJobId);
        await fetchJobDetails(initialJobId);
      } else {
        const res = await fetch(`/api/v1/imports?campaignId=${params.id}`);
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const latestId = json.data[0].id;
          setJobId(latestId);
          await fetchJobDetails(latestId);
        } else {
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatestOrSpecificJob();
  }, [params.id, initialJobId]);

  const handleFilterChange = (filter: any) => {
    setRecordsFilter(filter);
    if (jobId) {
      fetchJobDetails(jobId, filter);
    }
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditFormData({
      fullName: record.fullName,
      relationName: record.relationName || '',
      relationType: record.relationType || 'FATHER',
      houseNumber: record.houseNumber,
      age: record.age,
      gender: record.gender,
      epicNumber: record.epicNumber,
    });
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord || !jobId) return;
    try {
      const res = await fetch(`/api/v1/imports/${jobId}/records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          status: 'VALID',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update record');

      setEditingRecord(null);
      await fetchJobDetails(jobId, recordsFilter);
    } catch (err: any) {
      alert(`Correction error: ${err.message}`);
    }
  };

  const handlePublish = async () => {
    if (!jobId) return;
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/v1/imports/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: params.id,
          importId: jobId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Publishing failed');

      setPublishSuccess(
        `Successfully published ${json.data.publishedCount} voter records to PostgreSQL Database SSoT!`
      );
      setTimeout(() => {
        window.location.href = `/campaigns/${params.id}/voters`;
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Error publishing records');
    } finally {
      setPublishing(false);
    }
  };

  const isCompleted = importJob?.status === 'Completed' || importJob?.status === 'PUBLISHED';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Link href={`/campaigns/${params.id}/voters`} className="hover:underline">Voters</Link>
                <span>&gt;</span>
                <Link href={`/campaigns/${params.id}/voters/upload`} className="hover:underline">Imports</Link>
                <span>&gt;</span>
                <span className="text-slate-900 font-semibold">Review & Staging</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Electoral Roll AI Review Center</h1>
              <p className="text-xs text-slate-500 mt-1">
                Review and calibrate AI extractions against original PDF pages before publishing into operational database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || isCompleted || records.length === 0}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {publishing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Publishing to SSoT...</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Already Published</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Publish Verified Records ({statusCounts.VALID + statusCounts.LOW_CONFIDENCE})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {publishSuccess && (
            <div className="p-4 mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{publishSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Job Overview Cards */}
          {importJob && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Document</p>
                <p className="text-sm font-bold text-slate-900 truncate mt-1">{importJob.originalFilename}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{importJob.fileSize}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Total Extracted</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{statusCounts.TOTAL}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Electors parsed</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Avg Confidence</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">{((importJob.confidenceAvg || 0.95) * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-slate-400 mt-0.5">High accuracy</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Low Confidence</p>
                <p className={`text-lg font-bold mt-1 ${statusCounts.LOW_CONFIDENCE > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {statusCounts.LOW_CONFIDENCE}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Need attention</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Duplicates Flagged</p>
                <p className={`text-lg font-bold mt-1 ${statusCounts.DUPLICATE_SUSPECT > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {statusCounts.DUPLICATE_SUSPECT}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Collisions</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold mb-6">
            <button
              onClick={() => handleFilterChange('ALL')}
              className={`py-2.5 px-4 border-b-2 transition ${
                recordsFilter === 'ALL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Staged Records ({statusCounts.TOTAL})
            </button>
            <button
              onClick={() => handleFilterChange('LOW_CONFIDENCE')}
              className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 ${
                recordsFilter === 'LOW_CONFIDENCE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Low Confidence Queue</span>
              {statusCounts.LOW_CONFIDENCE > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">
                  {statusCounts.LOW_CONFIDENCE}
                </span>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('DUPLICATE_SUSPECT')}
              className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 ${
                recordsFilter === 'DUPLICATE_SUSPECT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Duplicate Review Queue</span>
              {statusCounts.DUPLICATE_SUSPECT > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">
                  {statusCounts.DUPLICATE_SUSPECT}
                </span>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('VALID')}
              className={`py-2.5 px-4 border-b-2 transition ${
                recordsFilter === 'VALID' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Verified / Ready ({statusCounts.VALID})
            </button>
            <Link
              href={`/campaigns/${params.id}/households`}
              className="py-2.5 px-4 border-b-2 border-transparent text-slate-500 hover:text-blue-600 transition flex items-center gap-1.5 ml-auto font-bold text-blue-600"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Review Family / Household Clusters →</span>
            </Link>
          </div>

          {/* Staged Records Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-sm">Loading staged records from PostgreSQL SSoT...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No records found for this filter</h3>
              <p className="text-xs text-slate-500 mt-1">
                {recordsFilter === 'ALL'
                  ? 'Upload an electoral roll PDF from the Upload tab to begin extraction.'
                  : `No records currently marked with ${recordsFilter}.`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Serial</th>
                    <th className="py-3 px-4">EPIC Number</th>
                    <th className="py-3 px-4">Voter Name</th>
                    <th className="py-3 px-4">Relation / Guardian</th>
                    <th className="py-3 px-4">House No</th>
                    <th className="py-3 px-4">Age / Gender</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">#{r.serialNumber}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.epicNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.fullName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.relationName ? `${r.relationName} (${r.relationType || 'OTHER'})` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.houseNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{r.age} yrs / {r.gender}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold ${
                            r.confidence >= 0.9
                              ? 'text-emerald-600'
                              : r.confidence >= 0.75
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'PUBLISHED'
                              ? 'bg-blue-100 text-blue-800'
                              : r.status === 'VALID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'LOW_CONFIDENCE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditRecord(r)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal for editing staged record */}
          {editingRecord && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Review / Correct Staged Elector #{editingRecord.serialNumber}
                  </h3>
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">EPIC Number</label>
                    <input
                      type="text"
                      value={editFormData.epicNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, epicNumber: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Full Name (Devanagari / English)</label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Relation Type</label>
                      <select
                        value={editFormData.relationType}
                        onChange={(e) => setEditFormData({ ...editFormData, relationType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-slate-900"
                      >
                        <option value="FATHER">Father</option>
                        <option value="HUSBAND">Husband</option>
                        <option value="MOTHER">Mother</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Relation / Guardian Name</label>
                      <input
                        type="text"
                        value={editFormData.relationName}
                        onChange={(e) => setEditFormData({ ...editFormData, relationName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">House Number</label>
                      <input
                        type="text"
                        value={editFormData.houseNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, houseNumber: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Age</label>
                      <input
                        type="number"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value, 10) || 18 })}
                        className="w-full px-3 py-2 border rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Gender</label>
                      <select
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-slate-900"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="O">Other (O)</option>
                      </select>
                    </div>
                  </div>

                  {editingRecord.sourceSnippet && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Raw OCR Snippet</p>
                      <pre className="font-mono text-[10px] text-slate-600 whitespace-pre-wrap">
                        {editingRecord.sourceSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCorrection}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Approve & Save Correction
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
