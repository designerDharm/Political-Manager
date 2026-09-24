'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Upload, FileText, Check, Clock, Trash2, RotateCw } from 'lucide-react';
import Link from 'next/link';

export default function VoterUploadPage({ params }: { params: { id: string } }) {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([
    { name: 'Ward_12_Part_1.pdf', size: '12.4 MB', status: 'Processing', progress: 65 },
    { name: 'Ward_12_Part_2.pdf', size: '11.8 MB', status: 'Queued', progress: 0 },
    { name: 'Ward_13.pdf', size: '14.2 MB', status: 'Pending', progress: 0 },
    { name: 'Ward_14.pdf', size: '9.6 MB', status: 'Pending', progress: 0 },
  ]);

  const steps = [
    { number: 1, title: 'Upload' },
    { number: 2, title: 'Processing' },
    { number: 3, title: 'Review' },
    { number: 4, title: 'Complete' },
  ];

  const handleClearAll = () => {
    setFiles([]);
  };

  const handleDelete = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
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
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Voter List</h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload electoral roll data to create your voter database. Supported formats include PDF, scanned PDF, CSV, and Excel files.
            </p>
          </div>

          {/* Stepper directly matching Voter data.png */}
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
            {/* Drag & Drop Upload Zone directly matching Voter data.png */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-400 p-12 text-center shadow-card flex flex-col items-center justify-center">
              <div className="w-16 h-20 bg-red-600 rounded-lg flex flex-col items-center justify-center text-white mb-4 shadow-sm relative">
                <span className="text-[11px] font-black tracking-wider">PDF</span>
                <span className="text-xs tracking-tighter mt-1 font-bold">=</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                Upload Electoral Roll (PDF, Scanned PDF, CSV, Excel)
              </h3>
              <p className="text-xs text-slate-500 mb-6">Drag & drop files here or</p>

              <button
                type="button"
                className="py-2.5 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm rounded-lg transition"
              >
                Choose Files
              </button>

              <p className="text-[11px] text-slate-400 mt-4">
                Multiple files allowed. Max size: 100MB per file.
              </p>
            </div>

            {/* Uploaded Files Queue Card */}
            {files.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    {files.length} Files <span className="text-slate-400 font-normal">(12.4 MB total)</span>
                  </h4>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                </div>

                <div className="space-y-3">
                  {files.map((file, idx) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px]">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {file.status === 'Processing' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                            Processing
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          </span>
                        )}

                        {file.status === 'Queued' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            Queued
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {file.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                            Pending
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <button
                          onClick={() => handleDelete(idx)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500">All uploads are verified against SHA-256 hash</span>
                  <Link
                    href={`/campaigns/${params.id}/voters`}
                    className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
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
