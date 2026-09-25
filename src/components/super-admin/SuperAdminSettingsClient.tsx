'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Server, Shield, Save, Check, AlertCircle } from 'lucide-react';

interface SettingsData {
  apiBaseEndpoint: string;
  maxUploadSize: string;
  auditRetention: string;
  strictNonInference: boolean;
  breakGlassDualControl: boolean;
}

export default function SuperAdminSettingsClient({ initialSettings }: { initialSettings: SettingsData }) {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to save settings');
      }

      setFeedback({ type: 'success', message: 'Platform global configuration saved and audited.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving settings' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <form onSubmit={handleSave}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Global Settings</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Configure platform-wide environment parameters, API limits, and operational feature flags.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="py-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3.5 mb-6 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {feedback.message}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" /> Platform Infrastructure
                </h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">API Base Endpoint</label>
                  <input
                    type="text"
                    value={settings.apiBaseEndpoint}
                    onChange={(e) => setSettings({ ...settings, apiBaseEndpoint: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Upload File Size (Electoral Roll Scans)</label>
                  <input
                    type="text"
                    value={settings.maxUploadSize}
                    onChange={(e) => setSettings({ ...settings, maxUploadSize: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audit Log Retention</label>
                  <input
                    type="text"
                    value={settings.auditRetention}
                    onChange={(e) => setSettings({ ...settings, auditRetention: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" /> Security & Policy Enforcements
                </h3>

                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-800 block">Strict Non-Inference Policy</span>
                    <span className="text-[11px] text-slate-500">Block any model or API query that infers voter preference.</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    LOCKED
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-800 block">Dual-Control Break-Glass</span>
                    <span className="text-[11px] text-slate-500">Require two super-admin approvals for raw database access.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.breakGlassDualControl}
                      onChange={(e) => setSettings({ ...settings, breakGlassDualControl: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
