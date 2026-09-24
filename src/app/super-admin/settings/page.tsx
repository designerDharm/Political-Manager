import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Settings, Shield, Server, Bell, Save } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Global Settings</h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure platform-wide environment parameters, API limits, and operational feature flags.
              </p>
            </div>

            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2">
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" /> Platform Infrastructure
              </h3>

              <div>
                <label className="block font-bold text-slate-700 mb-1">API Base Endpoint</label>
                <input type="text" defaultValue="https://api.campaignops.internal/v1" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-700" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Upload File Size (Electoral Roll Scans)</label>
                <input type="text" defaultValue="250 MB" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-700" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Log Retention</label>
                <input type="text" defaultValue="7 Years (Statutory Election Standard)" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> Security & Policy Enforcements
              </h3>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <span className="font-bold text-slate-800 block">Strict Non-Inference Policy</span>
                  <span className="text-[11px] text-slate-500">Block any model or API query that infers voter preference.</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  LOCKED
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <span className="font-bold text-slate-800 block">Dual-Control Break-Glass</span>
                  <span className="text-[11px] text-slate-500">Require two super-admin approvals for raw database access.</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                  ENABLED
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
