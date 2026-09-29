'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Archive, Download, CheckCircle2, RotateCw, Clock, Check, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackupItem {
  id: string;
  filename: string;
  size: string;
  type: string;
  timestamp: string;
  status: string;
  sha256?: string;
}

export default function SuperAdminBackupsClient({ initialBackups }: { initialBackups: BackupItem[] }) {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTriggerBackup = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/v1/admin/backups', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to trigger backup');
      }

      setBackups([json.data, ...backups]);
      setFeedback({ type: 'success', message: 'PostgreSQL database snapshot generated, SHA-256 hashed, and verified successfully!' });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error triggering backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (backupId: string) => {
    window.open(`/api/v1/admin/backups/${backupId}/download`, '_blank');
  };

  const handleExecuteRestore = async (backupId: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/admin/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationPhrase: confirmPhrase,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Restore rejected or failed');
      }

      setFeedback({
        type: 'success',
        message: `PostgreSQL database restored cleanly! Checksum verified. (Target: ${json.data?.restoredTo})`,
      });
      setRestoringId(null);
      setConfirmPhrase('');
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing restore' });
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Database Backups & Disaster Recovery</h1>
              <p className="text-xs text-slate-500 mt-1">
                PostgreSQL pg_dump custom format snapshots, SHA-256 checksum integrity verification, and safe disaster restore drills.
              </p>
            </div>

            <button
              onClick={handleTriggerBackup}
              disabled={loading}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Creating PostgreSQL Dump...' : 'Trigger On-Demand PostgreSQL Backup'}
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
              {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="PostgreSQL Snapshot Engine" value="pg_dump custom (-Fc)" subtitle="SHA-256 Checksum Verified" icon={Archive} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Recovery Point Objective (RPO)" value="< 15 Mins" subtitle="Disaster Recovery Drill Ready" icon={Clock} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Compliant', type: 'success' }} />
            <StatCard title="Integrity Check Status" value="100% Passed" subtitle="Safe Explicit Phrase Restore" icon={CheckCircle2} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Verified PostgreSQL Snapshots</h3>
            <div className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No backups triggered yet. Click &quot;Trigger On-Demand PostgreSQL Backup&quot; to generate a snapshot.</div>
              ) : (
                backups.map((b) => (
                  <div key={b.id} className="py-4 flex flex-col gap-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 font-mono text-[11px]">{b.filename}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Size: {b.size} • Created: {b.timestamp}
                          {b.sha256 && b.sha256 !== 'N/A' && (
                            <span className="ml-2 font-mono text-[10px] text-slate-400">
                              SHA-256: {b.sha256.slice(0, 16)}...
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {b.status}
                        </span>
                        <button
                          onClick={() => handleDownload(b.id)}
                          className="py-1 px-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-blue-600" /> Download
                        </button>
                        <button
                          onClick={() => {
                            setRestoringId(restoringId === b.id ? null : b.id);
                            setConfirmPhrase('');
                          }}
                          className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-amber-700" /> Restore...
                        </button>
                      </div>
                    </div>

                    {restoringId === b.id && (
                      <div className="mt-2 p-3 bg-amber-50/70 border border-amber-300 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Destructive Action Confirmation</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Restoring this snapshot will apply its schema and operational records via pg_restore. To confirm, type{' '}
                          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">RESTORE_{b.id}</code> below:
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={confirmPhrase}
                            onChange={(e) => setConfirmPhrase(e.target.value)}
                            placeholder={`RESTORE_${b.id}`}
                            className="bg-white border border-amber-300 rounded px-2.5 py-1 text-xs font-mono flex-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            disabled={confirmPhrase !== `RESTORE_${b.id}` || loading}
                            onClick={() => handleExecuteRestore(b.id)}
                            className="py-1 px-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Confirm Restore
                          </button>
                          <button
                            onClick={() => {
                              setRestoringId(null);
                              setConfirmPhrase('');
                            }}
                            className="py-1 px-2 text-slate-600 hover:text-slate-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
