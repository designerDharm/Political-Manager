'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';

export default function ImportReviewCenterPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'pages' | 'lowConfidence' | 'duplicates' | 'households'>('pages');

  const pipelineStages = [
    { name: '1. Upload', status: 'Completed' },
    { name: '2. Validation', status: 'Completed' },
    { name: '3. OCR Text', status: 'Completed' },
    { name: '4. Structured Extraction', status: 'Completed' },
    { name: '5. Low Confidence Review', status: 'Active' },
    { name: '6. Duplicate Review', status: 'Pending' },
    { name: '7. Household Suggestions', status: 'Pending' },
    { name: '8. Reconciliation', status: 'Pending' },
    { name: '9. Publish', status: 'Pending' },
  ];

  const lowConfidenceItems = [
    { id: 1, field: 'Guardian Name', extracted: 'Ram K?mar', confidence: '72%', page: 4, row: 18, suggested: 'Ram Kumar' },
    { id: 2, field: 'House Number', extracted: '12/A?', confidence: '68%', page: 7, row: 3, suggested: '12/A' },
  ];

  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [error, setError] = useState('');

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/v1/imports/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: params.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Publishing failed');

      setPublishSuccess(`Successfully published ${json.data.publishedVoters} voters and ${json.data.publishedHouseholds} households into Database SSoT!`);
      setTimeout(() => {
        window.location.href = `/campaigns/${params.id}/voters`;
      }, 1200);
    } catch (e: any) {
      setError(e.message || 'Error publishing records');
    } finally {
      setPublishing(false);
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <span>Voter Data</span>
                <span>&gt;</span>
                <span>Imports</span>
                <span>&gt;</span>
                <span className="text-slate-900 font-semibold">Job Review</span>
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
                disabled={publishing}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                {publishing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Publishing to SSoT...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Publish Verified Records</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {publishSuccess && (
            <div className="p-4 mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">
              {publishSuccess}
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 9-Stage Pipeline Stepper */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 shadow-card overflow-x-auto">
            <div className="flex items-center justify-between min-w-[750px] text-xs">
              {pipelineStages.map((st, i) => (
                <div key={st.name} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      st.status === 'Completed'
                        ? 'bg-emerald-500 text-white'
                        : st.status === 'Active'
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {st.status === 'Completed' ? '✓' : i + 1}
                  </div>
                  <span
                    className={`font-semibold ${
                      st.status === 'Active' ? 'text-blue-600 font-bold' : st.status === 'Completed' ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {st.name}
                  </span>
                  {i < pipelineStages.length - 1 && <span className="text-slate-300 mx-1">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold mb-6">
            <button
              onClick={() => setActiveTab('pages')}
              className={`py-2.5 px-4 border-b-2 transition ${
                activeTab === 'pages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Side-by-Side Page Viewer
            </button>
            <button
              onClick={() => setActiveTab('lowConfidence')}
              className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'lowConfidence' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Low Confidence Queue</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">2</span>
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              className={`py-2.5 px-4 border-b-2 transition ${
                activeTab === 'duplicates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Duplicate Review Queue
            </button>
            <button
              onClick={() => setActiveTab('households')}
              className={`py-2.5 px-4 border-b-2 transition ${
                activeTab === 'households' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Household Suggestion Explanations
            </button>
          </div>

          {/* Tab 1: Side-by-Side Review Viewer */}
          {activeTab === 'pages' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Original Source PDF Scan */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Original Document Scan (Page 4 of 32)</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ward_12_Part_1.pdf</span>
                </div>

                <div className="flex-1 min-h-[440px] bg-slate-100 border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-64 h-80 bg-white border border-slate-300 shadow-sm p-4 text-[9px] text-left font-mono space-y-2 text-slate-700 select-none">
                    <div className="font-bold border-b border-slate-200 pb-1 text-center text-[10px]">
                      ELECTORAL ROLL 2026 - PART 1
                    </div>
                    <div className="p-1.5 border border-slate-200 rounded">
                      <p>Serial: 001 • EPIC: ABC1234567</p>
                      <p className="font-bold">Name: Rajesh Kumar</p>
                      <p>Father: Ram Kumar</p>
                      <p>House No: 12 • Age: 48 • M</p>
                    </div>
                    <div className="p-1.5 border border-slate-200 rounded">
                      <p>Serial: 002 • EPIC: ABC1234568</p>
                      <p className="font-bold">Name: Sunita Devi</p>
                      <p>Husband: Rajesh Kumar</p>
                      <p>House No: 12 • Age: 44 • F</p>
                    </div>
                    <div className="p-1.5 border border-amber-300 bg-amber-50 rounded">
                      <p>Serial: 003 • EPIC: ABC1234569</p>
                      <p className="font-bold">Name: Rahul Kumar</p>
                      <p>Father: Rajesh Kumar</p>
                      <p>House No: 12 • Age: 23 • M</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-3">High-resolution OCR bounding box inspection active</span>
                </div>
              </div>

              {/* Right: Extracted Structured Data Table with Confidence */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Extracted Structured Records</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Average Confidence: 96.4%
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[440px] pr-1">
                  {[
                    { serial: 1, name: 'Rajesh Kumar', guardian: 'Ram Kumar (FATHER)', age: 48, epic: 'ABC1234567', conf: 98 },
                    { serial: 2, name: 'Sunita Devi', guardian: 'Rajesh Kumar (HUSBAND)', age: 44, epic: 'ABC1234568', conf: 96 },
                    { serial: 3, name: 'Rahul Kumar', guardian: 'Rajesh Kumar (FATHER)', age: 23, epic: 'ABC1234569', conf: 95 },
                  ].map((row) => (
                    <div key={row.serial} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">#{row.serial} {row.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({row.epic})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{row.guardian} • Age {row.age}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-600 font-mono">{row.conf}%</span>
                        <button className="p-1 text-slate-500 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Low Confidence Queue */}
          {activeTab === 'lowConfidence' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Low Confidence Extraction Queue</h3>
              <div className="space-y-3">
                {lowConfidenceItems.map((item) => (
                  <div key={item.id} className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.field}</span>
                        <span className="text-rose-600 font-mono font-bold">Confidence: {item.confidence}</span>
                        <span className="text-slate-400">(Page {item.page}, Row {item.row})</span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        OCR Extracted: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">{item.extracted}</code>
                        {' '} → Suggested: <strong className="text-emerald-700">{item.suggested}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">
                        Accept Suggestion
                      </button>
                      <button className="py-1.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold">
                        Manual Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
