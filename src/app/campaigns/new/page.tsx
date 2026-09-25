'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Calendar, Upload, Check, ArrowRight, User, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('Sharma for Assembly 2026');
  const [politicalParty, setPoliticalParty] = useState('Bharat Vikas Party');
  const [candidateName, setCandidateName] = useState('Rajesh Sharma');
  const [electionLevel, setElectionLevel] = useState('State Assembly (Regional)');
  const [electionYear, setElectionYear] = useState('2026');
  const [electionDate, setElectionDate] = useState('2026-02-28');
  const [description, setDescription] = useState('Development, Good Governance and Stronger Communities');
  const [targetVoters, setTargetVoters] = useState('125000');
  const [constituencyName, setConstituencyName] = useState('Ward 12 Central Assembly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Constituency' },
    { number: 3, title: 'Campaign Goals' },
    { number: 4, title: 'Review' },
  ];

  const handleNext = async () => {
    setError('');
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Step 4: Final Activation - POST to real API
      setLoading(true);
      try {
        const res = await fetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaignName,
            electionName: `${constituencyName} Election ${electionYear}`,
            electionLevel: electionLevel.toUpperCase().includes('PARLIAMENT') ? 'PARLIAMENTARY' : 'STATE_ASSEMBLY',
            electionYear: Number(electionYear) || 2026,
            candidateName,
            partyName: politicalParty,
            description,
            targetVoters: Number(targetVoters) || 0,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to create and activate campaign');
        }

        const newCampaignId = json.data?.id || 'sharma-assembly-2026';
        router.push(`/campaigns/${newCampaignId}`);
        router.refresh();
      } catch (err: any) {
        setError(err.message || 'An error occurred while creating campaign');
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Campaign Admin"
          userName="Rajesh Sharma"
          userRoleTitle="Campaign Admin"
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provision Campaign</h1>
            <p className="text-sm text-slate-500 mt-1">
              Set up your political campaign instance with election boundaries, candidate profile, and targets.
            </p>
          </div>

          {error && (
            <div className="p-4 mb-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              {error}
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

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Campaign Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="Enter campaign name"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Political Party <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={politicalParty}
                        onChange={(e) => setPoliticalParty(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      >
                        <option>Bharat Vikas Party</option>
                        <option>Independent Candidate</option>
                        <option>Democratic Alliance</option>
                        <option>People&apos;s Congress Party</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Candidate Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Enter candidate full name"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Election Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={electionLevel}
                        onChange={(e) => setElectionLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      >
                        <option>State Assembly (Regional)</option>
                        <option>Parliamentary (National)</option>
                        <option>Municipal Corporation (Local)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Election Year
                      </label>
                      <select
                        value={electionYear}
                        onChange={(e) => setElectionYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      >
                        <option>2026</option>
                        <option>2027</option>
                        <option>2028</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tentative Election Date
                      </label>
                      <input
                        type="date"
                        value={electionDate}
                        onChange={(e) => setElectionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Campaign Mission / Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide a brief description of your campaign objectives"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Candidate Photo</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Upload a clear photo of the candidate.</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                    <div className="w-full aspect-[4/5] bg-gradient-to-t from-slate-800 to-slate-700 rounded-lg overflow-hidden flex flex-col items-center justify-center text-white relative shadow-sm">
                      <div className="w-24 h-24 rounded-full bg-blue-600/30 flex items-center justify-center mb-2">
                        <User className="w-12 h-12 text-blue-200" />
                      </div>
                      <span className="font-semibold text-sm">{candidateName || 'Candidate Name'}</span>
                      <span className="text-xs text-slate-300">{politicalParty}</span>
                    </div>

                    <button
                      type="button"
                      className="w-full mt-3 py-2 px-3 border border-blue-600 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Change Photo
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="py-2.5 px-6 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>Next: Constituency</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Constituency */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <h2 className="text-base font-bold text-slate-900">Constituency & Electoral Geography</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Constituency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={constituencyName}
                    onChange={(e) => setConstituencyName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    State / Province
                  </label>
                  <input
                    type="text"
                    defaultValue="Rajasthan"
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 text-xs text-blue-900">
                Wards and Polling Booth boundaries will be extracted automatically during the Electoral Roll PDF ingestion process.
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-6 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>Next: Campaign Goals</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Campaign Goals */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <h2 className="text-base font-bold text-slate-900">Target Electors & Operational Goals</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Target Electors / Registered Voters
                  </label>
                  <input
                    type="number"
                    value={targetVoters}
                    onChange={(e) => setTargetVoters(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Expected Door-to-Door Coverage
                  </label>
                  <input
                    type="text"
                    defaultValue="90% of mapped households"
                    readOnly
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-2.5 px-6 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>Next: Review & Activate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Activate */}
          {step === 4 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <h2 className="text-base font-bold text-slate-900">Review Campaign Parameters</h2>
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Campaign Name:</span>
                  <strong className="text-slate-900 text-sm">{campaignName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Candidate:</span>
                  <strong className="text-slate-900 text-sm">{candidateName} ({politicalParty})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Election:</span>
                  <span className="text-slate-800 font-semibold">{constituencyName} • {electionLevel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Target Voters:</span>
                  <span className="text-slate-800 font-mono font-bold">{Number(targetVoters).toLocaleString()} electors</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-2.5 px-6 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="py-2.5 px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Activating Campaign...' : 'Activate Campaign'}</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
