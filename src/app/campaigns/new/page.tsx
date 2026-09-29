'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Check, ArrowRight, User, AlertCircle, Plus, Trash2, Building, MapPin, Flag, Target, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Step 1: Basic Info
  const [campaignName, setCampaignName] = useState('Demo Assembly Campaign 2026');
  const [partiesList, setPartiesList] = useState<{ id: string; name: string; abbreviation?: string; symbolUrl?: string }[]>([]);
  const [politicalParty, setPoliticalParty] = useState('Independent Candidate');
  const [isIndependent, setIsIndependent] = useState(true);
  const [candidateName, setCandidateName] = useState('Synthetic Candidate');
  const [candidateCount, setCandidateCount] = useState('1');
  const [electionLevel, setElectionLevel] = useState('STATE_ASSEMBLY');
  const [electionYear, setElectionYear] = useState('2026');
  const [electionDate, setElectionDate] = useState('2026-03-15');
  const [description, setDescription] = useState('Strategic voter outreach and booth governance');

  // Step 2: Constituency & Geography Hierarchy
  const [constituencyName, setConstituencyName] = useState('Demo Constituency');
  const [stateName, setStateName] = useState('Rajasthan');
  const [districtName, setDistrictName] = useState('Jaipur');
  const [declaredWardsCount, setDeclaredWardsCount] = useState('5');
  const [declaredVillagesCount, setDeclaredVillagesCount] = useState('0');
  const [localityType, setLocalityType] = useState('WARD'); // WARD or VILLAGE

  // Step 3: Configured Wards & Booths (Real records)
  const [wards, setWards] = useState<{ id?: string; wardNumber: number; name: string; localityType?: string; booths?: any[] }[]>([]);
  const [booths, setBooths] = useState<{ id?: string; wardId: string; boothNumber: number; name: string; areaLocality: string; pollingStation: string; totalElectors: number }[]>([]);

  // Step 4: Voter Estimates & Campaign Targets / Safe Margin
  const [estimatedVoters, setEstimatedVoters] = useState('50000');
  const [targetVotes, setTargetVotes] = useState('28000');
  const [safeMarginVotes, setSafeMarginVotes] = useState('4500');

  // Operational state
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const indianElectionLevels = [
    { value: 'LOK_SABHA', label: 'Lok Sabha (Parliamentary / National MP)' },
    { value: 'RAJYA_SABHA', label: 'Rajya Sabha (Council of States)' },
    { value: 'STATE_ASSEMBLY', label: 'Vidhan Sabha (State Legislative Assembly / MLA)' },
    { value: 'STATE_COUNCIL', label: 'Vidhan Parishad (State Legislative Council / MLC)' },
    { value: 'MUNICIPAL_CORP', label: 'Nagar Nigam / Municipal Corporation (Mayor & Ward Councillor)' },
    { value: 'MUNICIPAL_COUNCIL', label: 'Nagar Palika Parishad / Municipal Council (President & Member)' },
    { value: 'TOWN_PANCHAYAT', label: 'Nagar Panchayat / City Council' },
    { value: 'ZILLA_PARISHAD', label: 'Zilla Parishad (District Council - Panchayati Raj Tier 3)' },
    { value: 'PANCHAYAT_SAMITI', label: 'Panchayat Samiti / Block Panchayat (Tier 2)' },
    { value: 'GRAM_PANCHAYAT', label: 'Gram Panchayat (Sarpanch / Mukhiya / Ward Member - Tier 1)' },
    { value: 'CANTONMENT_BOARD', label: 'Cantonment Board Election (Civilian Urban Body)' },
    { value: 'COOPERATIVE_SOCIETY', label: 'Cooperative Society / Agricultural Board Election' },
    { value: 'BYE_ELECTION', label: 'By-Election / Upachunav (Casual Vacancy Replacement)' }
  ];

  const steps = [
    { number: 1, title: 'Basic Campaign' },
    { number: 2, title: 'Constituency & Hierarchy' },
    { number: 3, title: 'Wards & Booths' },
    { number: 4, title: 'Voter Estimate & Margin' },
    { number: 5, title: 'Review & Activate' },
  ];

  // Fetch registered parties from Single Source of Truth
  useEffect(() => {
    async function loadParties() {
      try {
        const res = await fetch('/api/v1/parties');
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setPartiesList(json.data);
          const ind = json.data.find((p: any) => p.name.toLowerCase().includes('independent'));
          if (ind) {
            setPoliticalParty(ind.name);
            setIsIndependent(true);
          } else {
            setPoliticalParty(json.data[0].name);
            setIsIndependent(false);
          }
        }
      } catch (err) {
        console.error('Failed to load parties from API:', err);
      }
    }
    loadParties();
  }, []);

  // Sync locality type conditional on election level
  useEffect(() => {
    if (['GRAM_PANCHAYAT', 'PANCHAYAT_SAMITI', 'ZILLA_PARISHAD'].includes(electionLevel)) {
      setLocalityType('VILLAGE');
    } else {
      setLocalityType('WARD');
    }
  }, [electionLevel]);

  // Handle party change
  const handlePartyChange = (val: string) => {
    setPoliticalParty(val);
    if (val.toLowerCase().includes('independent')) {
      setIsIndependent(true);
    } else {
      setIsIndependent(false);
    }
  };

  // Save or update Draft in PostgreSQL
  const persistDraft = async (targetStatus = 'SETUP'): Promise<string | null> => {
    setError('');
    try {
      const payload = {
        name: campaignName.trim(),
        electionName: `${constituencyName.trim()} Election ${electionYear}`,
        electionLevel,
        electionYear: Number(electionYear) || 2026,
        electionDate: electionDate || null,
        candidateName: candidateName.trim(),
        partyName: isIndependent ? 'Independent Candidate' : politicalParty,
        isIndependent,
        candidateCount: Number(candidateCount) || 1,
        description,
        constituencyName: constituencyName.trim(),
        stateName: stateName.trim(),
        districtName: districtName.trim(),
        declaredWards: Number(declaredWardsCount) || 0,
        declaredVillages: Number(declaredVillagesCount) || 0,
        declaredBooths: booths.length,
        estimatedVoters: Number(estimatedVoters) || 0,
        targetVoters: Number(estimatedVoters) || 0,
        targetVotes: Number(targetVotes) || 0,
        safeMarginVotes: Number(safeMarginVotes) || 0,
        status: targetStatus,
      };

      if (!campaignId) {
        // Create new campaign instance
        const res = await fetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to persist campaign');
        setCampaignId(json.data.id);
        return json.data.id;
      } else {
        // Update existing campaign instance
        const res = await fetch(`/api/v1/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to update campaign');
        return campaignId;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign to database');
      return null;
    }
  };

  // Scaffold default wards in DB
  const handleScaffoldWards = async (activeCampId: string) => {
    const count = Number(declaredWardsCount) || 5;
    try {
      const res = await fetch(`/api/v1/campaigns/${activeCampId}/wards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          localityType,
          prefix: localityType === 'VILLAGE' ? 'Village' : 'Ward',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to scaffold wards');
      
      const newWards = json.data;
      setWards(newWards);

      // Scaffold 2 booths per ward automatically
      const newBoothsList: any[] = [];
      for (const w of newWards) {
        const bRes = await fetch(`/api/v1/campaigns/${activeCampId}/booths`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wardId: w.id,
            count: 2,
            areaLocality: `${w.name} Sector`,
            pollingStation: `Govt School, ${w.name}`,
            totalElectors: Math.round((Number(estimatedVoters) || 50000) / (count * 2)),
          }),
        });
        const bJson = await bRes.json();
        if (bRes.ok && Array.isArray(bJson.data)) {
          newBoothsList.push(...bJson.data);
        }
      }
      setBooths(newBoothsList);
    } catch (err: any) {
      setError(err.message || 'Error configuring geography');
    }
  };

  const handleNext = async () => {
    setError('');
    setLoading(true);

    if (step === 1) {
      if (!campaignName.trim()) {
        setError('Campaign Name is required');
        setLoading(false);
        return;
      }
      if (!candidateName.trim()) {
        setError('Candidate Name is required');
        setLoading(false);
        return;
      }
      const cId = await persistDraft('SETUP');
      setLoading(false);
      if (cId) setStep(2);
      return;
    }

    if (step === 2) {
      if (!constituencyName.trim()) {
        setError('Area / Constituency name is required');
        setLoading(false);
        return;
      }
      const cId = await persistDraft('SETUP');
      if (cId) {
        // If wards are not yet created, scaffold them
        if (wards.length === 0) {
          await handleScaffoldWards(cId);
        }
        setStep(3);
      }
      setLoading(false);
      return;
    }

    if (step === 3) {
      if (wards.length === 0 || booths.length === 0) {
        setError('At least one Ward and one Booth must exist before proceeding');
        setLoading(false);
        return;
      }
      await persistDraft('SETUP');
      setLoading(false);
      setStep(4);
      return;
    }

    if (step === 4) {
      const v = Number(estimatedVoters);
      const tv = Number(targetVotes);
      const sm = Number(safeMarginVotes);
      if (isNaN(v) || v < 0) {
        setError('Estimated voters must be a valid non-negative number');
        setLoading(false);
        return;
      }
      if (isNaN(tv) || tv < 0) {
        setError('Target votes must be a valid non-negative number');
        setLoading(false);
        return;
      }
      if (isNaN(sm) || sm < 0) {
        setError('Safe margin votes must be a valid non-negative number');
        setLoading(false);
        return;
      }
      await persistDraft('READY');
      setLoading(false);
      setStep(5);
      return;
    }

    if (step === 5) {
      // Final activation
      try {
        const cId = await persistDraft('ACTIVE');
        if (cId) {
          router.push(`/campaigns/${cId}`);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'Failed to activate campaign');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualSaveDraft = async () => {
    setSavingDraft(true);
    const cId = await persistDraft('DRAFT');
    setSavingDraft(false);
    if (cId) {
      setSuccessMsg('Draft saved successfully to PostgreSQL database.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provision Campaign</h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure candidate, election level, constituency geography, wards, booths, and strategic safe margins.
              </p>
            </div>
            {campaignId && (
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={savingDraft}
                className="py-2 px-4 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {savingDraft ? 'Saving Draft...' : 'Save Incomplete Draft'}
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 mb-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Stepper */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 flex items-center justify-around shadow-sm max-w-5xl">
            {steps.map((s, idx) => {
              const isActive = s.number === step;
              const isDone = s.number < step;

              return (
                <div key={s.number} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden md:inline ${
                      isActive ? 'text-blue-600' : isDone ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-8 sm:w-12 h-0.5 bg-slate-200 ml-2 hidden lg:block" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Basic Campaign & Candidate/Party */}
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
                        placeholder="Enter campaign title"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Political Affiliation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={politicalParty}
                        onChange={(e) => handlePartyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      >
                        {partiesList.length === 0 ? (
                          <>
                            <option value="Independent Candidate">Independent Candidate (Free Symbol)</option>
                            <option value="Bharat Vikas Party">Bharat Vikas Party (BVP)</option>
                          </>
                        ) : (
                          partiesList.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} {p.abbreviation ? `(${p.abbreviation})` : ''} {p.symbolUrl ? `• ${p.symbolUrl}` : ''}
                            </option>
                          ))
                        )}
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
                        Number of Candidates (Party Slate)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={candidateCount}
                        onChange={(e) => setCandidateCount(e.target.value)}
                        placeholder="1"
                        disabled={isIndependent}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {isIndependent && (
                        <span className="text-[10px] text-slate-400 mt-1 block">Fixed to 1 for Independent Candidate</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Election Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={electionLevel}
                        onChange={(e) => setElectionLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      >
                        {indianElectionLevels.map((lvl) => (
                          <option key={lvl.value} value={lvl.value}>
                            {lvl.label}
                          </option>
                        ))}
                      </select>
                    </div>

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
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Campaign Mission & Agenda
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief statement of campaign values and manifesto"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Candidate Identity Card</h3>
                    <p className="text-xs text-slate-500 mt-0.5">ECI compliance and statutory visual preview.</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-center">
                    <div className="w-full aspect-[4/5] bg-gradient-to-t from-slate-900 to-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center text-white relative shadow-sm p-4">
                      <div className="w-20 h-20 rounded-full bg-blue-600/30 flex items-center justify-center mb-2">
                        <User className="w-10 h-10 text-blue-200" />
                      </div>
                      <span className="font-bold text-sm">{candidateName || 'Candidate Name'}</span>
                      <span className="text-xs text-slate-300 mt-0.5">{politicalParty}</span>
                      <span className="text-[10px] text-blue-300 mt-2 px-2 py-0.5 rounded bg-blue-900/60 font-mono">
                        {isIndependent ? 'INDEPENDENT CANDIDATE' : 'PARTY NOMINEE'}
                      </span>
                    </div>
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
                  disabled={loading}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Saving...' : 'Next: Constituency'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Constituency & Geographic Hierarchy */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Electoral Constituency & Geographic Hierarchy</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define the parent territory and specify expected ward or village subdivisions according to the election level.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Area / Constituency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={constituencyName}
                    onChange={(e) => setConstituencyName(e.target.value)}
                    placeholder="e.g. Jaipur Rural / Ward 12 Central"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    State / Union Territory
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    District / Region
                  </label>
                  <input
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Conditional Geographic Hierarchy Controls */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Geographic Hierarchy Configuration ({localityType === 'VILLAGE' ? 'Rural / Panchayat' : 'Urban / Municipal / Assembly'})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Number of {localityType === 'VILLAGE' ? 'Villages / Gram Panchayats' : 'Wards'} to Configure
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={declaredWardsCount}
                      onChange={(e) => setDeclaredWardsCount(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      The system will scaffold real database rows for these {localityType === 'VILLAGE' ? 'villages' : 'wards'} with customizable Part Booths.
                    </span>
                  </div>

                  {localityType === 'VILLAGE' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-xs">
                        Number of Habitations / Majras (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={declaredVillagesCount}
                        onChange={(e) => setDeclaredVillagesCount(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold text-sm"
                      />
                    </div>
                  )}
                </div>
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
                  disabled={loading}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Configuring Geography...' : 'Next: Wards & Booths'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Wards & Polling Booths (Database Verified) */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Configured Wards & Polling Booths</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real PostgreSQL records for downstream electoral roll mapping and agent booth-level assignments.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                    {wards.length} Wards
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    {booths.length} Polling Booths
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {wards.map((w) => {
                  const wardBooths = booths.filter((b) => b.wardId === w.id);
                  return (
                    <div key={w.id || w.wardNumber} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-sm text-slate-900">{w.name}</span>
                          <span className="text-xs text-slate-400 font-mono">(Part #{w.wardNumber})</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {wardBooths.length} Booths
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {wardBooths.map((b) => (
                          <div key={b.id || b.boothNumber} className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>Booth #{b.boothNumber}: {b.name}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {b.totalElectors} electors
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{b.pollingStation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                  disabled={loading}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Saving...' : 'Next: Voter Estimates'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Voter Estimates & Campaign Targets / Safe Margin */}
          {step === 4 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Voter Estimates & Safe Margin Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set declared estimated voter turnout, operational winning target, and statistical safe margin of victory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>Estimated Total Voters</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={estimatedVoters}
                    onChange={(e) => setEstimatedVoters(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold text-sm font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Declared setup count before official voter roll PDF import.
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                    <Flag className="w-4 h-4 text-emerald-600" />
                    <span>Target Votes (Victory Threshold)</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={targetVotes}
                    onChange={(e) => setTargetVotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold text-sm font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Minimum votes planned to guarantee decisive lead.
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Safe Margin of Votes</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={safeMarginVotes}
                    onChange={(e) => setSafeMarginVotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold text-sm font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Defensive buffer above anticipated opponent ceiling.
                  </span>
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
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/25 flex items-center gap-2 transition"
                >
                  <span>{loading ? 'Saving...' : 'Next: Review & Activate'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Activate */}
          {step === 5 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Review & Pre-Activation Verification</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify configured parameters before enabling live field operations and electoral roll imports.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Campaign Title:</span>
                  <strong className="text-slate-900 text-sm">{campaignName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Candidate / Party:</span>
                  <strong className="text-slate-900 text-sm">
                    {candidateName} ({isIndependent ? 'Independent' : politicalParty})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Election Level:</span>
                  <span className="text-slate-800 font-semibold">{electionLevel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Constituency:</span>
                  <span className="text-slate-800 font-semibold">{constituencyName} ({stateName})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Wards Configured:</span>
                  <span className="text-blue-600 font-bold">{wards.length} Wards</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Booths Configured:</span>
                  <span className="text-emerald-600 font-bold">{booths.length} Polling Booths</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimated Electors:</span>
                  <span className="text-slate-800 font-mono font-bold">{Number(estimatedVoters).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Target / Safe Margin:</span>
                  <span className="text-slate-800 font-mono font-bold">
                    {Number(targetVotes).toLocaleString()} (+{Number(safeMarginVotes).toLocaleString()})
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(4)}
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
                  <span>{loading ? 'Activating Campaign...' : 'Activate Campaign Instance'}</span>
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
