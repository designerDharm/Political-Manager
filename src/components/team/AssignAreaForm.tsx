'use client';

import React, { useState } from 'react';
import { UserCheck, MapPin, Check, AlertCircle, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AssignAreaForm({
  campaignId,
  users,
  wards,
  booths,
}: {
  campaignId: string;
  users: Array<{ id: string; displayName: string; role: string }>;
  wards: Array<{ id: string; name: string }>;
  booths: Array<{ id: string; name: string; boothNumber: number }>;
}) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || '');
  const [assignmentType, setAssignmentType] = useState<'Ward' | 'Booth' | 'Households'>('Booth');
  const [selectedWard, setSelectedWard] = useState(wards[0]?.id || '');
  const [selectedBooth, setSelectedBooth] = useState(booths[0]?.id || '');
  const [taskType, setTaskType] = useState('Voter Outreach & Verification');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Keep selected values up to date when users, wards, or booths are loaded
  React.useEffect(() => {
    if (!selectedUser && users.length > 0) setSelectedUser(users[0].id);
  }, [users, selectedUser]);

  React.useEffect(() => {
    if (!selectedWard && wards.length > 0) setSelectedWard(wards[0].id);
  }, [wards, selectedWard]);

  React.useEffect(() => {
    if (!selectedBooth && booths.length > 0) setSelectedBooth(booths[0].id);
  }, [booths, selectedBooth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveUserId = selectedUser || users[0]?.id;
    if (!effectiveUserId) {
      setError('Please select an agent to assign');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const activeBooth = booths.find(b => b.id === selectedBooth) || booths[0];
      const activeWard = wards.find(w => w.id === selectedWard) || wards[0];

      let scopeTarget = 'General';
      if (assignmentType === 'Booth') {
        scopeTarget = activeBooth ? `Booth ${activeBooth.boothNumber} - ${activeBooth.name}` : 'Booth 118';
      } else if (assignmentType === 'Ward') {
        scopeTarget = activeWard ? activeWard.name : 'Ward 12 - Central';
      } else {
        scopeTarget = 'Selected Households';
      }

      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          userId: effectiveUserId,
          scopeType: assignmentType.toUpperCase(),
          scopeTarget,
          taskType,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Assignment failed');

      setMessage('Area successfully assigned to field agent!');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to assign area');

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
          <UserCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Assign Areas to Agent</h3>
          <p className="text-[11px] text-slate-500">Assign wards, booths or households to a field agent.</p>
        </div>
      </div>

      {message && (
        <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
            Select Agent <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
          >
            {users.length === 0 ? (
              <option value="">No agents available</option>
            ) : (
              users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} ({u.role})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
            Assignment Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['Ward', 'Booth', 'Households'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAssignmentType(type)}
                className={`py-2 rounded-lg font-semibold transition ${
                  assignmentType === type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
              Select Ward <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              {wards.length === 0 ? (
                <option value="">Ward 12 (Central)</option>
              ) : (
                wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
              Select Booth <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBooth}
              onChange={(e) => setSelectedBooth(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              {booths.length === 0 ? (
                <option value="">Booth 118</option>
              ) : (
                booths.map((b) => (
                  <option key={b.id} value={b.id}>Booth {b.boothNumber} - {b.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Area Summary Box */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-blue-900 block text-[11px]">Selected Area</span>
              <span className="text-blue-700 text-[10px]">
                {assignmentType} assignment active for this precinct
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
            Task Type <span className="text-red-500">*</span>
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
          >
            <option>Voter Outreach & Verification</option>
            <option>Voter Information Slip (VIS) Delivery</option>
            <option>Follow-up Resolution</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
            Assignment Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add specific instructions for this assignment..."
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-blue-500/25 transition text-xs mt-2 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Assigning...</span>
            </>
          ) : (
            <span>Assign to Agent</span>
          )}
        </button>
      </form>
    </div>
  );
}
