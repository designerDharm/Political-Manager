'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  MoreVertical,
  Home,
  CheckCircle2,
  Cpu,
  FileText,
  Save,
  Check,
} from 'lucide-react';

export default function MobileVisitPage({ params }: { params: { hid: string } }) {
  const router = useRouter();
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['1']);
  const [visitStatus, setVisitStatus] = useState<string>('VISITED');
  const [saved, setSaved] = useState(false);

  const members = [
    { id: '1', name: 'Rajesh Kumar', age: 48, gender: 'M' },
    { id: '2', name: 'Sunita Devi', age: 44, gender: 'F' },
    { id: '3', name: 'Rahul Kumar', age: 23, gender: 'M' },
    { id: '4', name: 'Priya Kumari', age: 20, gender: 'F' },
  ];

  const statuses = [
    { id: 'VISITED', label: 'Visited' },
    { id: 'NO_ONE_AVAILABLE', label: 'No One Available' },
    { id: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required' },
    { id: 'DECLINED_CONTACT', label: 'Do Not Contact / Declined' },
  ];

  const toggleMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const selectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
  };

  const handleSave = async () => {
    setSaved(true);
    try {
      // Send standard sync mutation envelope (Docs 07)
      await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutations: [
            {
              mutationId: crypto.randomUUID(),
              deviceId: 'device-agent-01',
              userId: 'user-agent-01',
              campaignId: 'camp-default',
              entityType: 'household',
              entityId: params.hid || 'h-101',
              baseVersion: 1,
              operation: 'UPDATE_VISIT_STATUS',
              payload: {
                visitStatus,
                verificationStatus: 'VERIFIED',
                interactionOutcome: visitStatus,
                notes: `Mobile check-in. ${selectedMembers.length} member(s) present.`,
              },
              clientOccurredAt: new Date().toISOString(),
              queuedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (e) {
      console.warn('Sync queued offline:', e);
    }
    setTimeout(() => {
      router.push('/agent');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* Mobile Frame matching e69b1194-f2eb-4e85-9553-935a39c31df0.png */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-28 shadow-lg">
        
        {/* Top Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <Link href="/agent" className="p-1 -ml-1 text-slate-700 hover:text-slate-900">
            <ChevronLeft className="w-6 h-6" />
          </Link>

          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
            <span className="text-blue-600">Campaign</span>Ops
          </div>

          <button className="p-1 text-slate-500 hover:text-slate-700">
            <MoreVertical className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Title */}
          <div>
            <h1 className="text-xl font-black text-slate-900">Household H-001</h1>
            <p className="text-xs text-slate-500 font-medium">Ward 12 • Booth 118</p>
          </div>

          {/* Household Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-12 h-14 rounded-xl bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                Head
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Rajesh Kumar Family</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  House No. 12, Gandhi Nagar, Ward 12 • Near Hanuman Mandir
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/70 text-blue-700 text-[10px] font-bold">
                <Home className="w-3 h-3" /> H-001
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 text-[10px] font-bold">
                <Check className="w-3 h-3" /> Verified
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                <Cpu className="w-3 h-3" /> AI Confidence: 91%
              </span>
            </div>
          </div>

          {/* Members (4) List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-xs font-bold text-slate-900">Members (4)</h4>
              <button onClick={selectAll} className="text-xs font-bold text-blue-600 hover:underline">
                {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              {members.map((m) => {
                const isChecked = selectedMembers.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition ${
                          isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                        {m.name.slice(0, 1)}
                      </div>

                      <span className="text-xs font-bold text-slate-900">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>{m.age}</span>
                      <span>|</span>
                      <span>{m.gender}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visit Status Radios directly matching e69b1194...png */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2 px-1">Visit Status</h4>
            <div className="space-y-2">
              {statuses.map((st) => {
                const isSelected = visitStatus === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setVisitStatus(st.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                      <span>{st.label}</span>
                    </div>

                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Fixed Bottom Action Buttons directly matching e69b1194...png */}
        <div className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 p-4 grid grid-cols-2 gap-3 z-30 shadow-lg">
          <button
            type="button"
            className="py-3 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <FileText className="w-4 h-4" />
            Add Note
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/25 disabled:opacity-75"
          >
            <Save className="w-4 h-4" />
            <span>{saved ? 'Saved ✓' : 'Save'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
