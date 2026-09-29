'use client';

import React, { useState } from 'react';
import { Save, AlertCircle, Check, Settings, Shield, Target, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CampaignSettingsClientProps {
  campaign: any;
}

export function CampaignSettingsClient({ campaign }: CampaignSettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(campaign?.name || '');
  const [candidateName, setCandidateName] = useState(campaign?.candidateName || '');
  const [partyName, setPartyName] = useState(campaign?.partyName || 'Independent');
  const [description, setDescription] = useState(campaign?.description || '');
  const [constituencyName, setConstituencyName] = useState(campaign?.constituencyName || campaign?.electionName || '');
  const [estimatedVoters, setEstimatedVoters] = useState(String(campaign?.estimatedVoters || campaign?.targetVoters || 0));
  const [targetVotes, setTargetVotes] = useState(String(campaign?.targetVotes || 0));
  const [safeMarginVotes, setSafeMarginVotes] = useState(String(campaign?.safeMarginVotes || 0));
  const [status, setStatus] = useState(campaign?.status || 'ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/v1/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          candidateName: candidateName.trim(),
          partyName: partyName.trim(),
          description: description.trim(),
          constituencyName: constituencyName.trim(),
          estimatedVoters: Number(estimatedVoters) || 0,
          targetVotes: Number(targetVotes) || 0,
          safeMarginVotes: Number(safeMarginVotes) || 0,
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update campaign settings');
      }

      setSuccess('Campaign settings saved successfully to PostgreSQL database.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" /> General Campaign Metadata
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Election Level</label>
                  <input
                    type="text"
                    disabled
                    value={campaign?.electionLevel || 'STATE_ASSEMBLY'}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Election Year</label>
                  <input
                    type="text"
                    disabled
                    value={campaign?.electionYear || 2026}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Party Affiliation</label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Constituency / Area</label>
                <input
                  type="text"
                  value={constituencyName}
                  onChange={(e) => setConstituencyName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Mission</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" /> Electoral Planning & Safe Margins
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimated Voters</label>
                <input
                  type="number"
                  min="0"
                  value={estimatedVoters}
                  onChange={(e) => setEstimatedVoters(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Victory Votes</label>
                <input
                  type="number"
                  min="0"
                  value={targetVotes}
                  onChange={(e) => setTargetVotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Safe Margin of Votes</label>
                <input
                  type="number"
                  min="0"
                  value={safeMarginVotes}
                  onChange={(e) => setSafeMarginVotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" /> Lifecycle Status
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Campaign Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-bold"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SETUP">SETUP</option>
                  <option value="READY">READY</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                ACTIVE mode enables field agent door-to-door synchronization and electoral day operations.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" /> Security & Scope
            </h3>
            <div className="text-xs text-slate-500 space-y-2 mt-3 font-mono">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>Campaign ID:</span>
                <span className="font-bold text-slate-700 truncate max-w-[140px]">{campaign.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>Driver:</span>
                <span className="text-emerald-600 font-bold">PostgreSQL SSoT</span>
              </div>
              <div className="flex justify-between">
                <span>Wards / Booths:</span>
                <span className="text-slate-700 font-bold">
                  {campaign._count?.wards || 0} Wards / {campaign._count?.booths || 0} Booths
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
