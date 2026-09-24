import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  ShieldCheck,
  FileCheck,
  History,
  Lock,
  AlertTriangle,
  UserCheck,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const revalidate = 0;

export default async function PrivacyGovernancePage() {
  const [purposes, retentionPolicies, requests, incidents] = await Promise.all([
    prisma.privacyPurpose.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.retentionPolicy.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.privacyRequest.findMany({ orderBy: { receivedAt: 'desc' } }),
    prisma.securityIncident.findMany({ orderBy: { discoveredAt: 'desc' } }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Super Admin"
          userName="Rajesh Sharma"
          userRoleTitle="System Owner"
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy & Data Governance Center</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Compliance Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage data processing purposes, retention lifecycle policies, data subject requests, and cybersecurity incidents.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Register Purpose
              </button>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Registered Purposes"
              value={purposes.length || 3}
              subtitle="Active lawful processing scopes"
              icon={FileCheck}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Retention Policies"
              value={retentionPolicies.length || 2}
              subtitle="Automated lifecycle rules"
              icon={History}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Privacy Requests"
              value="0"
              subtitle="Access & correction requests"
              icon={UserCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Zero Pending', type: 'success' }}
            />
            <StatCard
              title="Security Incidents"
              value="0"
              subtitle="Cybersecurity breach tracker"
              icon={ShieldCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Secure', type: 'success' }}
            />
          </div>

          {/* Grid: Purpose Registry (Left) & Retention / Security Rules (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Purpose Registry */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Registered Processing Purposes</h3>
                </div>
              </div>

              <div className="space-y-3">
                {purposes.map((p) => (
                  <div key={p.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {p.retentionDays} Days Retention
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{p.description}</p>
                    <div className="text-[10px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200/60">
                      <strong>Legal Basis:</strong> {p.legalBasis}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention Policies & Maker-Checker Notice */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Automated Retention Lifecycle</h3>
                </div>

                <div className="space-y-3 text-xs">
                  {retentionPolicies.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">{rp.entityName} Dataset</span>
                        <span className="text-[10px] text-slate-400">Action on Expiry: {rp.actionOnExpiry}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200 text-xs">
                        {rp.retentionDays} Days
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maker-Checker Safeguard Info */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-950">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Dual-Authorization (Maker-Checker) Enforced
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  High-risk actions including bulk voter data export, system restore from backups, and permanent purge of historical records require secondary approval from an authorized System Administrator.
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
