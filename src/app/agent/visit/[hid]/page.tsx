'use client';

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Plus,
  X,
  RotateCw,
  WifiOff,
} from 'lucide-react';
import { offlineDB } from '@/lib/offline/db';
import { syncManager } from '@/lib/offline/syncManager';
import { OfflineSyncStatusBadge } from '@/components/pwa/OfflineSyncStatusBadge';

export default function MobileVisitPage({ params }: { params: { hid: string } }) {
  const router = useRouter();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [visitStatus, setVisitStatus] = useState<string>('VISITED');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState('Voter Data');
  const [issuePriority, setIssuePriority] = useState('MEDIUM');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    async function loadHousehold() {
      // 1. Try online fetch
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await fetch(`/api/v1/households/${params.hid}`);
          const json = await res.json();
          if (json.data) {
            setHousehold(json.data);
            if (json.data.members && json.data.members.length > 0) {
              setSelectedMembers(json.data.members.map((m: any) => m.id));
            }
            // Cache to IndexedDB for offline resilience
            await offlineDB.saveHouseholds([json.data]);
            setLoading(false);
            return;
          }
        } catch {
          // Network failed, proceed to local IndexedDB fallback
        }
      }

      // 2. Offline fallback to local IndexedDB
      try {
        const cached = await offlineDB.getHousehold(params.hid);
        if (cached) {
          setHousehold(cached);
          setIsOfflineMode(true);
          if (cached.members && cached.members.length > 0) {
            setSelectedMembers(cached.members.map((m: any) => m.id));
          }
        } else {
          setErrorMessage('Household not available offline. Please connect to download this sector.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load household from offline storage');
      } finally {
        setLoading(false);
      }
    }
    loadHousehold();
  }, [params.hid]);

  const members = household?.members || [];

  const statuses = [
    { id: 'VISITED', label: 'Visited & Contacted' },
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
      setSelectedMembers(members.map((m: any) => m.id));
    }
  };

  const [isSavedLocally, setIsSavedLocally] = useState(false);

  const handleSave = async () => {
    if (!household) return;
    setSaving(true);
    setErrorMessage('');

    const noteContent = notes.trim()
      ? notes.trim()
      : `Door-to-door visit. ${selectedMembers.length} member(s) present.`;

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await syncManager.queueFieldMutation({
          campaignId: household.campaignId,
          entityType: 'household',
          entityId: household.id,
          operation: 'UPDATE_STATUS_AND_VISIT',
          baseVersion: household.version || 1,
          payload: {
            status: visitStatus === 'VISITED' ? 'Verified' : household.status,
            visitStatus,
            notes: noteContent,
            voterId: selectedMembers[0] || null,
          },
        });

        // Update local cached household view
        household.status = visitStatus === 'VISITED' ? 'Verified' : household.status;
        await offlineDB.saveHouseholds([household]);

        setIsSavedLocally(true);
        setSaved(true);
        setTimeout(() => {
          router.push('/agent');
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to save offline visit');
        setSaving(false);
      }
      return;
    }

    // Online execution with fallback to offline queue on network error
    try {
      // 1. Record field interaction
      const res = await fetch(`/api/v1/households/${household.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: visitStatus,
          notes: noteContent,
          voterId: selectedMembers[0] || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to record visit online');
      }

      // 2. If status was VISITED, update household operational status to Verified
      if (visitStatus === 'VISITED') {
        await fetch(`/api/v1/households/${household.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Verified' }),
        });
      }

      setSaved(true);
      setTimeout(() => {
        router.push('/agent');
      }, 700);
    } catch {
      // Fallback: Queue mutation locally in IndexedDB
      try {
        await syncManager.queueFieldMutation({
          campaignId: household.campaignId,
          entityType: 'household',
          entityId: household.id,
          operation: 'UPDATE_STATUS_AND_VISIT',
          baseVersion: household.version || 1,
          payload: {
            status: visitStatus === 'VISITED' ? 'Verified' : household.status,
            visitStatus,
            notes: noteContent,
            voterId: selectedMembers[0] || null,
          },
        });

        setIsSavedLocally(true);
        setSaved(true);
        setTimeout(() => {
          router.push('/agent');
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to queue offline visit');
        setSaving(false);
      }
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDescription.trim()) return;

    setIssueSubmitting(true);

    // If offline, queue issue mutation
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await syncManager.queueFieldMutation({
          campaignId: household.campaignId,
          entityType: 'issue',
          entityId: `temp_iss_${Date.now()}`,
          operation: 'CREATE_ISSUE',
          payload: {
            campaignId: household.campaignId,
            boothId: household.boothId,
            householdId: household.id,
            title: issueTitle.trim(),
            category: issueCategory,
            priority: issuePriority,
            description: issueDescription.trim(),
          },
        });

        setShowIssueModal(false);
        setIssueTitle('');
        setIssueDescription('');
        alert('Issue queued locally (Pending Sync)!');
      } catch (err: any) {
        alert(err.message || 'Failed to queue issue offline');
      } finally {
        setIssueSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/v1/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: household.campaignId,
          boothId: household.boothId,
          householdId: household.id,
          title: issueTitle.trim(),
          category: issueCategory,
          priority: issuePriority,
          description: issueDescription.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create issue');

      setShowIssueModal(false);
      setIssueTitle('');
      setIssueDescription('');
      alert('Issue reported successfully!');
    } catch {
      // Fallback to offline queue
      try {
        await syncManager.queueFieldMutation({
          campaignId: household.campaignId,
          entityType: 'issue',
          entityId: `temp_iss_${Date.now()}`,
          operation: 'CREATE_ISSUE',
          payload: {
            campaignId: household.campaignId,
            boothId: household.boothId,
            householdId: household.id,
            title: issueTitle.trim(),
            category: issueCategory,
            priority: issuePriority,
            description: issueDescription.trim(),
          },
        });
        setShowIssueModal(false);
        setIssueTitle('');
        setIssueDescription('');
        alert('Network interrupted. Issue queued locally (Pending Sync)!');
      } catch (err: any) {
        alert(err.message || 'Failed to report issue');
      }
    } finally {
      setIssueSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorMessage && !household) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
        <h2 className="text-base font-bold text-slate-800">Access Denied or Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{errorMessage}</p>
        <Link href="/agent" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-28 shadow-lg">
        
        {/* Top Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <Link href="/agent" aria-label="Back to Dashboard" className="p-1 -ml-1 text-slate-700 hover:text-slate-900">
            <ChevronLeft className="w-6 h-6" />
          </Link>

          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
            <span className="text-blue-600">Campaign</span>Ops
          </div>

          <div className="flex items-center gap-2">
            <OfflineSyncStatusBadge campaignId={household?.campaignId} />
            <button
              type="button"
              onClick={() => setShowIssueModal(true)}
              aria-label="Report Operational Issue"
              className="p-1 text-slate-500 hover:text-slate-700 text-xs font-semibold flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px]">Report</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 space-y-4 flex-1 overflow-y-auto">
          {errorMessage && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-xl font-black text-slate-900" aria-label={`Household ID: ${household?.code || params.hid}`}>
              Household <span data-testid="household-id">{household?.code || params.hid}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {household?.booth?.ward?.name || 'Ward'} • Booth #{household?.booth?.boothNumber || '1'}
            </p>
          </div>

          {/* Household Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-12 h-14 rounded-xl bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                Head
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {household?.primaryContactName ? `${household.primaryContactName} Family` : (household?.members?.[0]?.name ? `${household.members[0].name} Family` : 'Household')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {household?.address || `House #${household?.houseNumber || 'N/A'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/70 text-blue-700 text-[10px] font-bold">
                <Home className="w-3 h-3" /> {household?.code || params.hid}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                household?.status === 'Verified' || household?.status === 'Confirmed'
                  ? 'bg-emerald-100/70 text-emerald-800'
                  : 'bg-amber-100/70 text-amber-800'
              }`}>
                <Check className="w-3 h-3" /> {household?.status || 'Pending'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                <Cpu className="w-3 h-3" /> AI Conf: {household?.aiConfidence || 90}%
              </span>
            </div>
          </div>

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-bold text-slate-900">Members ({members.length})</h2>
              <button
                type="button"
                onClick={selectAll}
                aria-label={selectedMembers.length === members.length ? 'Deselect all members' : 'Select all members'}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden" role="group" aria-label="Household members">
              {members.map((m: any) => {
                const isChecked = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    aria-label={`Select member ${m.name}`}
                    onClick={() => toggleMember(m.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
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

                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">EPIC: {m.epicNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>{m.age}y</span>
                      <span>•</span>
                      <span>{m.gender}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visit Status Radios */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-slate-900 mb-2 px-1" id="visit-status-label">
              Visit Status
            </legend>
            <div role="radiogroup" aria-labelledby="visit-status-label" className="space-y-2">
              {statuses.map((st) => {
                const isSelected = visitStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Visit Status: ${st.label}`}
                    onClick={() => setVisitStatus(st.id)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
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
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Visit Note Preview / Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label htmlFor="visit-notes-display" className="text-xs font-bold text-slate-900 cursor-pointer">
                Visit Notes
              </label>
              <button
                type="button"
                onClick={() => setShowNoteModal(true)}
                aria-label={notes ? 'Edit Visit Note' : 'Add Visit Note'}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {notes ? 'Edit Note' : '+ Add Note'}
              </button>
            </div>
            {notes ? (
              <div id="visit-notes-display" className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-700">
                {notes}
              </div>
            ) : (
              <p id="visit-notes-display" className="text-[11px] text-slate-400 italic px-1">No note attached yet.</p>
            )}
          </div>

          {/* Previous Visits / History */}
          {household?.interactions && household.interactions.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-900 mb-2 px-1">Previous Visit History</h2>
              <div className="space-y-2">
                {household.interactions.map((int: any) => (
                  <div key={int.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{int.status}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(int.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                    {int.notes && <p className="text-[11px] text-slate-600">{int.notes}</p>}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Agent: {int.agent?.displayName || 'Field Worker'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* Fixed Bottom Action Buttons */}
        <div className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 p-4 grid grid-cols-2 gap-3 z-30 shadow-lg">
          <button
            type="button"
            onClick={() => setShowNoteModal(true)}
            aria-label={notes ? 'Edit Visit Note' : 'Add Visit Note'}
            className="py-3 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <FileText className="w-4 h-4" />
            {notes ? 'Edit Note' : 'Add Note'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            aria-label="Save Visit"
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/25 disabled:opacity-75"
          >
            {saving ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saved
                ? isSavedLocally
                  ? 'Saved on device (Pending Sync)'
                  : 'Saved ✓'
                : saving
                ? 'Saving...'
                : 'Save Visit'}
            </span>
          </button>
        </div>

        {/* Note Dialog Modal */}
        {showNoteModal && (
          <div role="dialog" aria-modal="true" aria-labelledby="modal-note-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 id="modal-note-title" className="font-bold text-sm text-slate-900">Add Field Visit Note</h3>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  aria-label="Close note dialog"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label htmlFor="visit-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Visit Notes
                </label>
                <textarea
                  id="visit-notes"
                  name="visitNotes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter details of your visit with this family..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  aria-label="Done note editing"
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Issue Report Modal */}
        {showIssueModal && (
          <div role="dialog" aria-modal="true" aria-labelledby="modal-issue-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 id="modal-issue-title" className="font-bold text-sm text-slate-900">Report Operational Issue</h3>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  aria-label="Close issue report dialog"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="issue-title" className="block font-bold text-slate-700 text-[10px] uppercase mb-1">Issue Title</label>
                  <input
                    id="issue-title"
                    name="issueTitle"
                    type="text"
                    required
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="e.g. Discrepancy in Voter Age or Address"
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="issue-category" className="block font-bold text-slate-700 text-[10px] uppercase mb-1">Category</label>
                    <select
                      id="issue-category"
                      name="issueCategory"
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option>Voter Data</option>
                      <option>Household Data</option>
                      <option>Follow-up</option>
                      <option>Logistics</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="issue-priority" className="block font-bold text-slate-700 text-[10px] uppercase mb-1">Priority</label>
                    <select
                      id="issue-priority"
                      name="issuePriority"
                      value={issuePriority}
                      onChange={(e) => setIssuePriority(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="issue-description" className="block font-bold text-slate-700 text-[10px] uppercase mb-1">Description</label>
                  <textarea
                    id="issue-description"
                    name="issueDescription"
                    rows={3}
                    required
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe the discrepancy or follow-up needed..."
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={issueSubmitting}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
                  >
                    {issueSubmitting ? 'Submitting...' : 'Report Issue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

