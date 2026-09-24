'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Calendar, Upload, Check, ArrowRight, User } from 'lucide-react';
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

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Constituency' },
    { number: 3, title: 'Campaign Goals' },
    { number: 4, title: 'Review' },
  ];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.push('/campaigns/sharma-assembly-2026');
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Campaign</h1>
            <p className="text-sm text-slate-500 mt-1">
              Set up your campaign with basic details and configuration.
            </p>
          </div>

          {/* Stepper directly matching Campaign.png */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 flex items-center justify-around shadow-sm">
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

          {/* Step 1 Form Card matching Campaign.png */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Form Inputs (2 Cols) */}
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
                    <p className="text-[11px] text-slate-400 mt-1">Enter a clear and recognizable campaign name.</p>
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
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Select the political party.</p>
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
                    <p className="text-[11px] text-slate-400 mt-1">Enter the full name of the candidate.</p>
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
                      <option>Parliament (National)</option>
                      <option>Municipality / City Corporation</option>
                      <option>Village Panchayat</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Choose the election level for this campaign.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Election Year <span className="text-red-500">*</span>
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
                    <p className="text-[11px] text-slate-400 mt-1">Select the election year.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Election Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={electionDate}
                        onChange={(e) => setElectionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Choose the official election date.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Campaign Description
                    </label>
                    <span className="text-xs text-slate-400">{description.length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a brief description of your campaign objectives"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Provide a brief description of your campaign objectives and key focus areas.</p>
                </div>
              </div>

              {/* Right Photo Upload Box directly matching Campaign.png */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Candidate Photo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload a clear, professional photo of the candidate.</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                  <div className="w-full aspect-[4/5] bg-gradient-to-t from-slate-800 to-slate-700 rounded-lg overflow-hidden flex flex-col items-center justify-center text-white relative shadow-sm">
                    <div className="w-24 h-24 rounded-full bg-blue-600/30 flex items-center justify-center mb-2">
                      <User className="w-12 h-12 text-blue-200" />
                    </div>
                    <span className="font-semibold text-sm">Rajesh Sharma</span>
                    <span className="text-xs text-slate-300">Candidate Preview</span>
                  </div>

                  <button
                    type="button"
                    className="w-full mt-3 py-2 px-3 border border-blue-600 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Change Photo
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5">Supported formats: JPG, PNG • Max size: 2MB</p>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
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
                <span>{step === 4 ? 'Activate Campaign' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
