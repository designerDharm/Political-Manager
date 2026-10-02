'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import {
  Check,
  ArrowRight,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Building,
  MapPin,
  Flag,
  Target,
  Shield,
  Edit2,
  Save,
  X,
  RefreshCw,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatBoothLabel, formatWardLabel } from '@/lib/formatting';

function CreateCampaignWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCampaignId = searchParams.get('campaignId') || searchParams.get('id');

  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(paramCampaignId || null);
  const [initialLoading, setInitialLoading] = useState(!!paramCampaignId);

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
  const [wards, setWards] = useState<{ id: string; wardNumber: number; name: string; localityType?: string; booths?: any[] }[]>([]);
  const [booths, setBooths] = useState<{ id: string; wardId: string; boothNumber: number; name: string; areaLocality: string; pollingStation: string; totalElectors: number }[]>([]);

  // Editing state for wards & booths
  const [editingWardId, setEditingWardId] = useState<string | null>(null);
  const [editingWardName, setEditingWardName] = useState('');
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [editingBoothName, setEditingBoothName] = useState('');
  const [editingBoothStation, setEditingBoothStation] = useState('');
  const [editingBoothLocality, setEditingBoothLocality] = useState('');
  const [editingBoothElectors, setEditingBoothElectors] = useState<number>(0);
  const [newBoothWardId, setNewBoothWardId] = useState<string | null>(null);
  const [newBoothName, setNewBoothName] = useState('');
  const [newBoothElectors, setNewBoothElectors] = useState('1000');
  const [addingWard, setAddingWard] = useState(false);
  const [newWardName, setNewWardName] = useState('');

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
    { value: 'BYE_ELECTION', label: 'By-Election / Upachunav (Casual Vacancy Replacement)' },
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
          if (!paramCampaignId) {
            const ind = json.data.find((p: any) => p.name.toLowerCase().includes('independent'));
            if (ind) {
              setPoliticalParty(ind.name);
              setIsIndependent(true);
            } else {
              setPoliticalParty(json.data[0].name);
              setIsIndependent(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load parties from API:', err);
      }
    }
    loadParties();
  }, [paramCampaignId]);

  // Load existing campaign data if resuming
  useEffect(() => {
    if (!paramCampaignId) return;

    async function loadExistingCampaign() {
      setInitialLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/v1/campaigns/${paramCampaignId}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to load existing campaign data');
        }

        const data = json.data;
        setCampaignId(data.id);
        if (data.name) setCampaignName(data.name);
        if (data.partyName) {
          setPoliticalParty(data.partyName);
          setIsIndependent(data.partyName.toLowerCase().includes('independent'));
        }
        if (data.candidateName) setCandidateName(data.candidateName);
        if (data.candidateCount) setCandidateCount(String(data.candidateCount));
        if (data.electionLevel) setElectionLevel(data.electionLevel);
        if (data.electionYear) setElectionYear(String(data.electionYear));
        if (data.electionDate) setElectionDate(data.electionDate.substring(0, 10));
        if (data.description) setDescription(data.description);
        if (data.constituencyName) setConstituencyName(data.constituencyName);
        if (data.stateName) setStateName(data.stateName);
        if (data.districtName) setDistrictName(data.districtName);
        if (data.declaredWards) setDeclaredWardsCount(String(data.declaredWards));
        if (data.declaredVillages) setDeclaredVillagesCount(String(data.declaredVillages));

        if (data.estimatedVoters !== undefined && data.estimatedVoters !== null) {
          setEstimatedVoters(String(data.estimatedVoters));
        }
        if (data.targetVotes !== undefined && data.targetVotes !== null) {
          setTargetVotes(String(data.targetVotes));
        }
        if (data.safeMarginVotes !== undefined && data.safeMarginVotes !== null) {
          setSafeMarginVotes(String(data.safeMarginVotes));
        }

        const loadedWards = (data.wards || []).map((w: any) => ({
          id: w.id,
          wardNumber: w.wardNumber,
          name: w.name,
          localityType: w.localityType,
        }));
        setWards(loadedWards);

        const loadedBooths = (data.booths || []).map((b: any) => ({
          id: b.id,
          wardId: b.wardId,
          boothNumber: b.boothNumber,
          name: b.name,
          areaLocality: b.areaLocality || '',
          pollingStation: b.pollingStation || '',
          totalElectors: b.totalElectors || 0,
        }));
        setBooths(loadedBooths);

        // Resume at the first incomplete step
        if (!data.name || !data.candidateName) {
          setStep(1);
        } else if (!data.constituencyName) {
          setStep(2);
        } else if (loadedWards.length === 0 || loadedBooths.length === 0) {
          setStep(3);
        } else if (data.status === 'READY') {
          setStep(5);
        } else {
          // If hierarchy is already configured, let user inspect/edit hierarchy or proceed to Step 4
          setStep(3);
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching campaign details');
      } finally {
        setInitialLoading(false);
      }
    }

    loadExistingCampaign();
  }, [paramCampaignId]);

  // Sync locality type conditional on election level (only if new or empty)
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

  // Refresh wards and booths from API
  const refreshHierarchy = async (cId: string) => {
    try {
      const res = await fetch(`/api/v1/campaigns/${cId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        if (json.data.wards) {
          setWards(
            json.data.wards.map((w: any) => ({
              id: w.id,
              wardNumber: w.wardNumber,
              name: w.name,
              localityType: w.localityType,
            }))
          );
        }
        if (json.data.booths) {
          setBooths(
            json.data.booths.map((b: any) => ({
              id: b.id,
              wardId: b.wardId,
              boothNumber: b.boothNumber,
              name: b.name,
              areaLocality: b.areaLocality || '',
              pollingStation: b.pollingStation || '',
              totalElectors: b.totalElectors || 0,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to refresh hierarchy:', err);
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
        declaredWards: wards.length > 0 ? wards.length : Number(declaredWardsCount) || 0,
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
        // Update existing campaign instance (Strict deduplication)
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

  // Scaffold default wards in DB (Only when wards are 0)
  const handleScaffoldWards = async (activeCampId: string) => {
    if (wards.length > 0) return;
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

  // Hierarchy Management Actions (Step 3)
  const handleSaveWardName = async (wardId: string) => {
    if (!campaignId || !editingWardName.trim()) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/wards/${wardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingWardName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update ward name');
      setWards((prev) => prev.map((w) => (w.id === wardId ? { ...w, name: editingWardName.trim() } : w)));
      setEditingWardId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteWard = async (wardId: string) => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/wards/${wardId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete ward');
      setWards((prev) => prev.filter((w) => w.id !== wardId));
      setBooths((prev) => prev.filter((b) => b.wardId !== wardId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddNewWard = async () => {
    if (!campaignId || !newWardName.trim()) return;
    try {
      const nextNum = wards.length > 0 ? Math.max(...wards.map((w) => w.wardNumber)) + 1 : 1;
      const res = await fetch(`/api/v1/campaigns/${campaignId}/wards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardNumber: nextNum,
          name: newWardName.trim(),
          localityType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create ward');
      setWards((prev) => [...prev, json.data]);
      setNewWardName('');
      setAddingWard(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveBooth = async (boothId: string) => {
    if (!campaignId || !editingBoothName.trim()) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/booths/${boothId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBoothName.trim(),
          pollingStation: editingBoothStation.trim(),
          areaLocality: editingBoothLocality.trim(),
          totalElectors: Number(editingBoothElectors) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update booth');
      setBooths((prev) =>
        prev.map((b) =>
          b.id === boothId
            ? {
                ...b,
                name: editingBoothName.trim(),
                pollingStation: editingBoothStation.trim(),
                areaLocality: editingBoothLocality.trim(),
                totalElectors: Number(editingBoothElectors) || 0,
              }
            : b
        )
      );
      setEditingBoothId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteBooth = async (boothId: string) => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/booths/${boothId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete booth');
      setBooths((prev) => prev.filter((b) => b.id !== boothId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddNewBooth = async (wardId: string) => {
    if (!campaignId || !newBoothName.trim()) return;
    try {
      const targetWard = wards.find((w) => w.id === wardId);
      const nextBoothNum = booths.length > 0 ? Math.max(...booths.map((b) => b.boothNumber)) + 1 : 1;
      const res = await fetch(`/api/v1/campaigns/${campaignId}/booths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardId,
          boothNumber: nextBoothNum,
          name: newBoothName.trim(),
          areaLocality: `${targetWard?.name || 'Ward'} Area`,
          pollingStation: `Govt School, ${newBoothName.trim()}`,
          totalElectors: Number(newBoothElectors) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create booth');
      setBooths((prev) => [...prev, json.data]);
      setNewBoothWardId(null);
      setNewBoothName('');
      setNewBoothElectors('1000');
    } catch (err: any) {
      setError(err.message);
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
        // Only scaffold if wards are zero
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

  if (initialLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar role="CAMPAIGN_ADMIN" campaignId={campaignId || undefined} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader currentCampaignId={campaignId || undefined} />
          <main className="flex-1 p-8 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Loading Existing Campaign Configuration...</h3>
              <p className="text-xs text-slate-500 mt-1">Fetching saved state from PostgreSQL database.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={campaignId || undefined} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={campaignId || undefined} />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {paramCampaignId ? 'Resume Campaign Setup' : 'Provision Campaign'}
                </h1>
                {paramCampaignId && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                    RESUMING EXISTING INSTANCE
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Configure candidate, election level, constituency geography, wards, booths, and strategic safe margins.
              </p>
            </div>
            {campaignId && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSaveDraft}
                  disabled={savingDraft}
                  className="py-2 px-4 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  {savingDraft ? 'Saving Draft...' : 'Save Incomplete Draft'}
                </button>
              </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (campaignId) setStep(s.number);
                    }}
                    disabled={!campaignId && s.number > step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </button>
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
                      {wards.length > 0
                        ? `This campaign already contains ${wards.length} persisted ${localityType === 'VILLAGE' ? 'villages' : 'wards'}.`
                        : `The system will scaffold real database rows for these ${localityType === 'VILLAGE' ? 'villages' : 'wards'} with customizable Part Booths.`}
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

          {/* Step 3: Wards & Polling Booths (Database Verified & Interactive Editing) */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-5xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  {campaignId && (
                    <button
                      type="button"
                      onClick={() => setAddingWard(true)}
                      className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm ml-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Ward
                    </button>
                  )}
                </div>
              </div>

              {/* Add Ward Modal / Inline Form */}
              {addingWard && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                      New Ward / Village Name
                    </label>
                    <input
                      type="text"
                      value={newWardName}
                      onChange={(e) => setNewWardName(e.target.value)}
                      placeholder={`e.g. ${localityType === 'VILLAGE' ? 'Village 3' : 'Ward 6'}`}
                      className="w-full p-2 border border-blue-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto mt-2 sm:mt-4">
                    <button
                      type="button"
                      onClick={handleAddNewWard}
                      className="py-2 px-3 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Save Ward
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingWard(false);
                        setNewWardName('');
                      }}
                      className="py-2 px-3 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                {wards.map((w) => {
                  const wardBooths = booths.filter((b) => b.wardId === w.id);
                  const isEditingThisWard = editingWardId === w.id;

                  return (
                    <div key={w.id || w.wardNumber} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2 flex-1">
                          <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          {isEditingThisWard ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingWardName}
                                onChange={(e) => setEditingWardName(e.target.value)}
                                className="px-2 py-1 text-xs border border-blue-400 rounded bg-white font-bold text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveWardName(w.id)}
                                className="p-1 text-emerald-600 hover:text-emerald-800"
                                title="Save ward name"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWardId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-sm text-slate-900">{w.name}</span>
                              <span className="text-xs text-slate-400 font-mono">(Part #{w.wardNumber})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWardId(w.id);
                                  setEditingWardName(w.name);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 transition"
                                title="Edit ward name"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-500">
                            {wardBooths.length} Booths
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewBoothWardId(w.id);
                              setNewBoothName(`Booth ${booths.length + 1} - ${w.name}`);
                            }}
                            className="py-1 px-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3 text-blue-600" />
                            Add Booth
                          </button>
                          {wardBooths.length === 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWard(w.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 transition"
                              title="Delete empty ward"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Add Booth Inline Form */}
                      {newBoothWardId === w.id && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 my-3">
                          <div className="text-xs font-bold text-emerald-900 mb-2">
                            Add New Polling Booth to {w.name}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={newBoothName}
                              onChange={(e) => setNewBoothName(e.target.value)}
                              placeholder="Booth Name"
                              className="p-1.5 border border-emerald-300 rounded text-xs bg-white"
                            />
                            <input
                              type="number"
                              value={newBoothElectors}
                              onChange={(e) => setNewBoothElectors(e.target.value)}
                              placeholder="Total Electors"
                              className="p-1.5 border border-emerald-300 rounded text-xs bg-white"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddNewBooth(w.id)}
                                className="py-1 px-3 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition"
                              >
                                Save Booth
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewBoothWardId(null)}
                                className="py-1 px-3 border border-slate-300 bg-white text-slate-600 rounded text-xs hover:bg-slate-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {wardBooths.map((b) => {
                          const isEditingThisBooth = editingBoothId === b.id;

                          if (isEditingThisBooth) {
                            return (
                              <div
                                key={b.id || b.boothNumber}
                                className="bg-white p-3 rounded-lg border-2 border-blue-400 text-xs space-y-2 shadow-sm"
                              >
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-bold uppercase">
                                    Booth Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editingBoothName}
                                    onChange={(e) => setEditingBoothName(e.target.value)}
                                    className="w-full p-1 border border-slate-300 rounded text-xs font-semibold"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase">
                                      Electors
                                    </label>
                                    <input
                                      type="number"
                                      value={editingBoothElectors}
                                      onChange={(e) => setEditingBoothElectors(Number(e.target.value))}
                                      className="w-full p-1 border border-slate-300 rounded text-xs font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase">
                                      Polling Station
                                    </label>
                                    <input
                                      type="text"
                                      value={editingBoothStation}
                                      onChange={(e) => setEditingBoothStation(e.target.value)}
                                      className="w-full p-1 border border-slate-300 rounded text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveBooth(b.id)}
                                    className="py-1 px-2.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBoothId(null)}
                                    className="py-1 px-2.5 border border-slate-300 bg-white text-slate-600 rounded text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={b.id || b.boothNumber}
                              className="bg-white p-3 rounded-lg border border-slate-200 text-xs hover:border-slate-300 transition"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span className="truncate pr-2">
                                  {formatBoothLabel(b.boothNumber, b.name)}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                    {b.totalElectors.toLocaleString()} electors
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBoothId(b.id);
                                      setEditingBoothName(b.name);
                                      setEditingBoothStation(b.pollingStation);
                                      setEditingBoothLocality(b.areaLocality);
                                      setEditingBoothElectors(b.totalElectors);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600"
                                    title="Edit booth"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBooth(b.id)}
                                    className="p-1 text-slate-300 hover:text-rose-600"
                                    title="Delete booth"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{b.pollingStation || 'Polling Station'}</span>
                              </div>
                            </div>
                          );
                        })}
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

export default function CreateCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="text-slate-500 text-xs font-semibold">Loading campaign wizard...</div>
        </div>
      }
    >
      <CreateCampaignWizard />
    </Suspense>
  );
}
