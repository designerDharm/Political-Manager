import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  Settings,
  Shield,
  Key,
  Database,
  Lock,
  RefreshCw,
  Bell,
  Save,
  Check,
} from 'lucide-react';

export const revalidate = 0;

export default async function CampaignSettingsPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
      election: true,
    },
  });

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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Settings & Security</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                  {campaign?.name || 'Sharma Assembly Campaign 2026'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure campaign metadata, security scopes, offline sync permissions, and statutory retention rules.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* General Settings (2 cols) */}
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
                      defaultValue={campaign?.name || 'Sharma Assembly Campaign 2026'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Election Level</label>
                      <input
                        type="text"
                        disabled
                        defaultValue={campaign?.electionLevel || 'STATE_ASSEMBLY'}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Election Year</label>
                      <input
                        type="text"
                        disabled
                        defaultValue={campaign?.electionYear || 2026}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Candidate Name</label>
                      <input
                        type="text"
                        defaultValue={campaign?.candidateName || 'Rajesh Sharma'}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Party Affiliation</label>
                      <input
                        type="text"
                        defaultValue={campaign?.partyName || 'Independent'}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Protection & Statutory Privacy */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" /> Data Protection & Electoral Compliance
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 block">Strict Non-Inference Policy Guardrail</span>
                      <span className="text-[11px] text-slate-500">Prevent persuasion scoring, caste/religion categorization, or sentiment profiling.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      ENFORCED (Docs 13)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 block">Decoupled VIS Help Desk Mode</span>
                      <span className="text-[11px] text-slate-500">Separates voter slip distribution logs completely from official polling turnout.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                      ENABLED (Docs 12)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 block">Immutable Source Snapshot Policy</span>
                      <span className="text-[11px] text-slate-500">Original scanned PDF / OCR pages are archived with cryptographic SHA-256 hashes.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      ACTIVE (Docs 06)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Sync & Security Parameters (1 col) */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" /> Offline Mobile Sync
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Controls how field agent devices cache voter data and sync offline mutations.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Local Cache TTL</label>
                    <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                      <option>24 Hours (Recommended)</option>
                      <option>12 Hours</option>
                      <option>48 Hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Remote Device Revocation</label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Immediately invalidate agent tokens and wipe local IndexedDB cache upon assignment change.
                    </p>
                    <button className="w-full py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-bold text-[11px] transition">
                      Revoke Inactive Devices
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" /> Database Scope
                </h3>
                <div className="text-xs text-slate-500 space-y-2 mt-3 font-mono">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>Campaign ID:</span>
                    <span className="font-bold text-slate-700">{params.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>Isolation:</span>
                    <span className="text-emerald-600 font-bold">Tenant Scoped</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Driver:</span>
                    <span className="text-slate-700 font-bold">SQLite / Prisma SSoT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
