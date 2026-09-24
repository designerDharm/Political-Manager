import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  UserCheck,
  Award,
  Vote,
  ShieldCheck,
  Building,
  Plus,
  Edit3,
  ExternalLink,
} from 'lucide-react';

export const revalidate = 0;

export default async function CandidatesPage({ params }: { params: { id: string } }) {
  const [candidates, campaign] = await Promise.all([
    prisma.candidate.findMany({
      include: {
        party: true,
        campaigns: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.campaign.findUnique({
      where: { id: params.id },
      include: { election: true },
    }),
  ]);

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
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidates & Contesting Slate</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  {campaign?.electionName || 'General Assembly 2026'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official candidate nominations, party declarations, and statutory affidavits for this electoral constituency.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Contesting Candidate
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Campaign Lead Candidate"
              value={campaign?.candidateName || 'Rajesh Sharma'}
              subtitle={campaign?.partyName || 'Independent'}
              icon={UserCheck}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Registered Candidates"
              value={candidates.length.toString()}
              subtitle="Valid nominations filed"
              icon={Vote}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
            />
            <StatCard
              title="Constituency Level"
              value={campaign?.electionLevel || 'STATE_ASSEMBLY'}
              subtitle="Official electoral tier"
              icon={Building}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Affidavit Status"
              value="Verified"
              subtitle="Form 26 statutory filing compliant"
              icon={ShieldCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Compliant', type: 'success' }}
            />
          </div>

          {/* Candidate Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base border-2 border-blue-200">
                        {c.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{c.fullName}</h3>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {c.party?.name || 'Independent'} ({c.party?.abbreviation || 'IND'})
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Nominated
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">ECI Candidate ID</span>
                      <span className="font-mono font-medium text-slate-800">CAN-{c.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Affidavit Status</span>
                      <span className="font-medium text-emerald-700">Form 26 Filed</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Election Year</span>
                      <span className="font-medium text-slate-800">2026</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <a
                    href="https://affidavit.eci.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  >
                    ECI Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
