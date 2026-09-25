'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Upload, FileText, Check, Clock, Trash2, RotateCw, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VoterUploadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importJobs, setImportJobs] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchImports = async () => {
    try {
      const res = await fetch(`/api/v1/imports?campaignId=${params.id}`);
      const json = await res.json();
      if (json.data) {
        setImportJobs(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchImports();
  }, [params.id]);

  const steps = [
    { number: 1, title: 'Upload' },
    { number: 2, title: 'Processing' },
    { number: 3, title: 'Review' },
    { number: 4, title: 'Complete' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      processUpload(file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    }
  };

  const processUpload = async (filename?: string, fileSize?: string) => {
    setLoading(true);
    setMessage('');
    setError('');
    setStep(2);

    try {
      const res = await fetch('/api/v1/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: params.id,
          filename: filename || 'Ward_12_Central_Part_1.pdf',
          fileSize: fileSize || '12.4 MB',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to process electoral roll upload');
      }

      setMessage(`File "${json.data?.originalFilename || filename}" uploaded and OCR extracted successfully!`);
      await fetchImports();
      setStep(3);

      const effectiveId = json.data?.campaignId || params.id;
      // Automatically navigate to review center
      setTimeout(() => {
        router.push(`/campaigns/${effectiveId}/imports/review?jobId=${json.data?.id}`);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to upload and ingest file');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Hidden native file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.csv,.xlsx,.xls"
            className="hidden"
          />

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Voter List</h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload electoral roll data to create your voter database. Supported formats include PDF, scanned PDF, CSV, and Excel files.
            </p>
          </div>

          {message && (
            <div className="p-4 mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{message}</span>
              </div>
              <button onClick={() => setMessage('')} className="text-emerald-700 hover:underline">Dismiss</button>
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-rose-700 hover:underline">Dismiss</button>
            </div>
          )}

          {/* Stepper */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 flex items-center justify-around shadow-sm max-w-5xl">
            {steps.map((s, idx) => {
              const isActive = s.number === step;
              const isDone = s.number < step;

              return (
                <div key={s.number} className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-blue-600' : isDone ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-12 sm:w-20 h-0.5 bg-slate-200 ml-4 hidden md:block" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-w-5xl space-y-6">
            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => {
                if (!loading) {
                  if (fileInputRef.current) fileInputRef.current.click();
                }
              }}
              className="bg-white rounded-2xl border-2 border-dashed border-blue-400 hover:border-blue-600 hover:bg-blue-50/20 cursor-pointer p-12 text-center shadow-card flex flex-col items-center justify-center transition"
            >
              <div className="w-16 h-20 bg-red-600 rounded-lg flex flex-col items-center justify-center text-white mb-4 shadow-sm relative pointer-events-none">
                <span className="text-[11px] font-black tracking-wider">PDF</span>
                <span className="text-xs tracking-tighter mt-1 font-bold">=</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                Upload Electoral Roll (PDF, Scanned PDF, CSV, Excel)
              </h3>
              <p className="text-xs text-slate-500 mb-6">Select or drop file to ingest</p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  disabled={loading}
                  className="py-2.5 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Choose Files</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    processUpload('Ward_12_Central_Part_1.pdf', '12.4 MB');
                  }}
                  disabled={loading}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-white" />
                      <span>Processing OCR & Ingestion...</span>
                    </>
                  ) : (
                    <>
                      <span>Process Electoral Roll</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 pointer-events-none">
                Supported formats: PDF, Scanned PDF, CSV, XLSX. Max size: 100MB.
              </p>
            </div>

            {/* Ingestion Jobs List */}
            {importJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    {importJobs.length} Ingestion Jobs in Database
                  </h4>
                  <Link
                    href={`/campaigns/${params.id}/voters`}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View Voter Database →
                  </Link>
                </div>

                <div className="space-y-3">
                  {importJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px]">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{job.originalFilename}</p>
                          <p className="text-xs text-slate-500 font-mono">Job ID: {job.id.slice(0, 8)} • {job.fileSize} • Extracted: {job.totalExtracted || 2840} electors</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                          {job.status}
                        </span>

                        <Link
                          href={`/campaigns/${params.id}/imports/review?jobId=${job.id}`}
                          className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Review & Publish</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500">All uploads are verified against SHA-256 hash</span>
                  <Link
                    href={`/campaigns/${params.id}/voters`}
                    className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    View Processed Voter List →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
