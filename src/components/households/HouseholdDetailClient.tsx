'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  ArrowLeft,
  Printer,
  Home,
  CheckCircle,
  Cpu,
  User,
  MapPin,
  Edit2,
  ArrowRightLeft,
  FilePlus,
  Clock,
  MoreVertical,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
  Scissors,
  Check,
  RotateCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';

export interface HouseholdDetailData {
  id: string;
  code: string;
  address: string;
  houseNumber: string;
  aiConfidence: number;
  status: string;
  evidenceSignals?: string;
  primaryContactName?: string | null;
  primaryContactId?: string | null;
  booth?: {
    name: string;
    boothNumber: number;
    ward?: {
      name: string;
      wardNumber: number;
    };
  } | null;
  members: {
    id: string;
    serialNumber?: number;
    name: string;
    age: number;
    gender: string;
    epicNumber: string;
    roleInHousehold?: string | null;
    relationshipType?: string | null;
    guardianName?: string | null;
  }[];
  interactions: {
    id: string;
    status: string;
    notes?: string | null;
    occurredAt: string;
    agent?: {
      displayName: string;
    } | null;
  }[];
}

export default function HouseholdDetailClient({
  campaignId,
  household,
}: {
  campaignId: string;
  household: HouseholdDetailData;
}) {
  const router = useRouter();
  const [interactions, setInteractions] = useState(household.interactions);
  const [members, setMembers] = useState(household.members);
  const [currentHousehold, setCurrentHousehold] = useState(household);

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveMemberModalOpen, setIsMoveMemberModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Selected member for action
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [targetHouseholdCode, setTargetHouseholdCode] = useState('');
  const [createNewForMove, setCreateNewForMove] = useState(false);
  const [newHouseNo, setNewHouseNo] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Split selected members
  const [selectedSplitVoterIds, setSelectedSplitVoterIds] = useState<string[]>([]);

  // Edit address form
  const [editAddress, setEditAddress] = useState(household.address);
  const [editHouseNo, setEditHouseNo] = useState(household.houseNumber);
  const [editPrimaryContactName, setEditPrimaryContactName] = useState(household.primaryContactName || '');

  // Form states for note
  const [noteStatus, setNoteStatus] = useState('CONTACTED');
  const [noteText, setNoteText] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Authoritative refetch on realtime events
  const refetchHousehold = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/households/${household.id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setCurrentHousehold(json.data);
        if (json.data.members) setMembers(json.data.members);
        if (json.data.interactions) setInteractions(json.data.interactions);
      }
    } catch (e) {
      console.error('Failed to refetch household:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [household.id]);

  const { connectionState } = useCampaignRealtime({
    campaignId,
    onEvent: (event) => {
      // If event targets this household or general visits/household actions, refetch
      if (
        event.entityType === 'Household' ||
        event.type === 'FIELD_VISIT_RECORDED' ||
        event.type.startsWith('HOUSEHOLD_')
      ) {
        refetchHousehold();
      }
    },
  });

  // Add field interaction / note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/households/${household.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: noteStatus,
          notes: noteText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record interaction');

      setInteractions([
        {
          id: json.data.id,
          status: json.data.status,
          notes: json.data.notes,
          occurredAt: json.data.occurredAt || new Date().toISOString(),
          agent: { displayName: json.data.agent?.displayName || 'Active Campaign Agent' },
        },
        ...interactions,
      ]);

      setFeedback({ type: 'success', message: 'New field interaction recorded into PostgreSQL database.' });
      setIsNoteModalOpen(false);
      setNoteText('');
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Confirm household
  const handleConfirmHousehold = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/households/${household.id}/confirm`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to confirm household');

      setCurrentHousehold({ ...currentHousehold, status: 'Confirmed' });
      setFeedback({ type: 'success', message: 'Household confirmed successfully!' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Edit address & primary contact
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/households/${household.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: editAddress,
          houseNumber: editHouseNo,
          primaryContactName: editPrimaryContactName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update household');

      setCurrentHousehold({
        ...currentHousehold,
        address: json.data.address,
        houseNumber: json.data.houseNumber,
        primaryContactName: json.data.primaryContactName,
      });
      setFeedback({ type: 'success', message: 'Household address and contact updated!' });
      setIsEditModalOpen(false);
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Move member
  const handleMoveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setLoading(true);
    try {
      const payload: any = {
        voterId: selectedMember.id,
      };

      if (createNewForMove) {
        payload.createNewHousehold = true;
        payload.newHouseNumber = newHouseNo || selectedMember.houseNumber;
        payload.newAddress = newAddress;
      } else {
        payload.targetHouseholdId = targetHouseholdCode;
      }

      const res = await fetch(`/api/v1/households/${household.id}/move-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to move member');

      setMembers(members.filter((m) => m.id !== selectedMember.id));
      setIsMoveMemberModalOpen(false);
      setSelectedMember(null);
      setFeedback({ type: 'success', message: `Elector ${selectedMember.name} moved successfully!` });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Split household
  const handleSplitHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSplitVoterIds.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/households/${household.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterIds: selectedSplitVoterIds,
          newHouseNumber: newHouseNo,
          newAddress: newAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to split household');

      setMembers(members.filter((m) => !selectedSplitVoterIds.includes(m.id)));
      setIsSplitModalOpen(false);
      setSelectedSplitVoterIds([]);
      setFeedback({
        type: 'success',
        message: `Split successfully created new household ${json.data.code}!`,
      });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const primaryContact =
    members.find((m) => m.name === currentHousehold.primaryContactName) ||
    members[0] || { name: 'Unassigned', age: 0 };

  let evidenceList: string[] = [];
  try {
    evidenceList = JSON.parse(currentHousehold.evidenceSignals || '[]');
  } catch {}

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={campaignId} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/campaigns/${campaignId}/households`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Households List
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Address / Contact</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSplitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>Split Household</span>
              </button>

              {currentHousehold.status !== 'Confirmed' && currentHousehold.status !== 'Verified' && (
                <button
                  type="button"
                  onClick={handleConfirmHousehold}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Grouping</span>
                </button>
              )}
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

          {/* Household Hero Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-card">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Household {currentHousehold.code}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentHousehold.booth?.ward?.name || 'Ward 1'} • {currentHousehold.booth?.name || 'Booth 1'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {currentHousehold.status}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Confidence: {currentHousehold.aiConfidence}%
                </span>
              </div>
            </div>

            {/* Evidence Signals */}
            {evidenceList.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-800 block mb-1.5">
                  Algorithmic Grouping Evidence Signals
                </span>
                <div className="flex flex-wrap gap-2">
                  {evidenceList.map((sig, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-white text-blue-700 text-xs font-medium border border-blue-200 flex items-center gap-1">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{sig}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Contact Panel */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-16 h-20 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                <User className="w-7 h-7 text-slate-300 mb-1" />
                <span className="text-[9px] text-slate-300 font-normal">Contact</span>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-semibold mb-2">
                  <User className="w-3 h-3 text-emerald-600" />
                  Primary Household Contact: {primaryContact.name}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {primaryContact.name} {primaryContact.age > 0 ? `(${primaryContact.age} yrs)` : ''}
                </h3>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    House No. {currentHousehold.houseNumber}, {currentHousehold.address}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Household Members ({members.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Guardian / Relation</th>
                    <th className="p-3">Age / Gender</th>
                    <th className="p-3">EPIC No.</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3 text-slate-600">
                        {m.guardianName ? `${m.guardianName} (${m.relationshipType || 'OTHER'})` : '—'}
                      </td>
                      <td className="p-3 text-slate-600">{m.age} yrs / {m.gender}</td>
                      <td className="p-3 font-mono text-slate-700">{m.epicNumber}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setIsMoveMemberModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition inline-flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Relocate / Move</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <FilePlus className="w-3.5 h-3.5" />
                Add Field Note / Visit Interaction
              </button>
            </div>
          </div>

          {/* Interaction History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Interaction & Field Visit History</h3>
              <span className="text-xs text-slate-400 font-mono">{interactions.length} recorded</span>
            </div>

            <div className="space-y-4">
              {interactions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No interactions recorded yet. Click &quot;Add Field Note / Visit Interaction&quot; above to log a visit.
                </div>
              ) : (
                interactions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.notes || 'Door-to-door field interaction'}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.status}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          Agent: <strong>{item.agent?.displayName || 'Campaign Field Agent'}</strong> •{' '}
                          {new Date(item.occurredAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(item.occurredAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal: Move Member */}
          {isMoveMemberModalOpen && selectedMember && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Relocate Elector: {selectedMember.name}
                  </h3>
                  <button onClick={() => setIsMoveMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleMoveMember} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={createNewForMove}
                        onChange={(e) => setCreateNewForMove(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Create a brand-new household for this elector</span>
                    </label>
                  </div>

                  {createNewForMove ? (
                    <>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">New House Number</label>
                        <input
                          type="text"
                          value={newHouseNo}
                          onChange={(e) => setNewHouseNo(e.target.value)}
                          placeholder="e.g. 14/B or 22"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">New Address / Locality</label>
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="e.g. Street 4, Sector 2"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Target Household UUID or Code
                      </label>
                      <input
                        type="text"
                        value={targetHouseholdCode}
                        onChange={(e) => setTargetHouseholdCode(e.target.value)}
                        placeholder="e.g. Household UUID or leave blank to ungroup"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Leave blank to mark elector as unlinked/ungrouped.
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMoveMemberModalOpen(false)}
                      className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      {loading ? 'Moving...' : 'Confirm Move'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Split Household */}
          {isSplitModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Split Family Unit into New Household
                  </h3>
                  <button onClick={() => setIsSplitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSplitHousehold} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Select Electors to Move into New Household:
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-lg bg-slate-50">
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSplitVoterIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSplitVoterIds([...selectedSplitVoterIds, m.id]);
                              } else {
                                setSelectedSplitVoterIds(selectedSplitVoterIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="font-semibold text-slate-900">{m.name}</span>
                          <span className="text-[10px] text-slate-400">({m.epicNumber} • {m.age} yrs)</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">New House Number</label>
                      <input
                        type="text"
                        value={newHouseNo}
                        onChange={(e) => setNewHouseNo(e.target.value)}
                        placeholder="e.g. 12/1"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">New Address</label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="e.g. First Floor, Street 4"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSplitModalOpen(false)}
                      className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || selectedSplitVoterIds.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold"
                    >
                      {loading ? 'Splitting...' : `Split (${selectedSplitVoterIds.length}) to New Household`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Edit Address & Primary Contact */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Household Details
                  </h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">House Number</label>
                    <input
                      type="text"
                      value={editHouseNo}
                      onChange={(e) => setEditHouseNo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Address / Locality</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Primary Household Contact</label>
                    <select
                      value={editPrimaryContactName}
                      onChange={(e) => setEditPrimaryContactName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.epicNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Add Field Note */}
          {isNoteModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Record Field Visit for {currentHousehold.code}</h3>
                  <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddNote} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Interaction Outcome / Status</label>
                    <select
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      <option value="CONTACTED">Door Knock - Contacted Family</option>
                      <option value="VERIFIED">Address & Electors Verified</option>
                      <option value="FOLLOW_UP_REQUESTED">Follow-Up Requested</option>
                      <option value="CANDIDATE_MET">Personal Interaction with Candidate</option>
                      <option value="LOCKED">House Locked / Not Available</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Field Observation / Discussion Notes</label>
                    <textarea
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="e.g. Met head of household, discussed water pipeline grievance, positive engagement"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNoteModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                    >
                      {loading ? 'Recording...' : 'Save Interaction'}
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
