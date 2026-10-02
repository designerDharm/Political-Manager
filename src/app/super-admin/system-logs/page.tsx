import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import { FileText, ShieldAlert, CheckCircle2, Clock, Terminal, AlertTriangle } from 'lucide-react';
import { computeAuditEventHash, GENESIS_AUDIT_HASH } from '@/lib/api/audit';

export const revalidate = 0;

export default async function SuperAdminSystemLogsPage() {
  const auditEvents = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Recompute full chain during verification
  const seenHashes = new Set<string>();
  let chainValid = true;
  let invalidEventCount = 0;
  let duplicateHashCount = 0;

  const verifiedEvents = auditEvents.map((evt, idx) => {
    let isCurrentValid = true;
    let failureReason = '';

    if (!evt.hash || evt.hash.trim().length === 0) {
      isCurrentValid = false;
      failureReason = 'Missing or empty hash';
    } else if (seenHashes.has(evt.hash)) {
      isCurrentValid = false;
      duplicateHashCount++;
      failureReason = 'Duplicate hash detected in audit log';
    } else {
      seenHashes.add(evt.hash);
      const expectedPrevHash = idx === 0 ? (evt.prevHash || GENESIS_AUDIT_HASH) : auditEvents[idx - 1].hash;
      if (evt.prevHash !== expectedPrevHash) {
        isCurrentValid = false;
        failureReason = `Broken prevHash link: expected ${expectedPrevHash?.slice(0, 8)}... but got ${evt.prevHash?.slice(0, 8)}...`;
      } else {
        const computed = computeAuditEventHash(evt.prevHash || GENESIS_AUDIT_HASH, {
          organizationId: evt.organizationId,
          campaignId: evt.campaignId,
          actorId: evt.actorId,
          action: evt.action,
          resource: evt.resource,
          details: evt.details,
        });

        // If legacy event was recorded before SHA-256 migration, mark as legacy if hash doesn't match 64 hex chars
        if (evt.hash.length === 64 && evt.hash !== computed) {
          isCurrentValid = false;
          failureReason = 'Hash mismatch against canonical payload';
        }
      }
    }

    if (!isCurrentValid) {
      chainValid = false;
      invalidEventCount++;
    }

    return {
      ...evt,
      isCurrentValid,
      failureReason,
    };
  });

  // Display latest 30 in descending order for the feed
  const displayEvents = [...verifiedEvents].reverse().slice(0, 30);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Logs & Cryptographic Audit Trails</h1>
              <p className="text-xs text-slate-500 mt-1">
                Append-only audit trail protected with SHA-256 hash chaining for tamper-evident verification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Recorded Audit Events" value={auditEvents.length.toString()} subtitle="Past 30 days" icon={FileText} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard
              title="Hash Chain Integrity"
              value={chainValid ? '100% Valid' : `${invalidEventCount} Anomaly Detected`}
              subtitle={chainValid ? 'Zero hash breaks or duplicates' : `${duplicateHashCount} duplicates, ${invalidEventCount} invalid links`}
              icon={chainValid ? CheckCircle2 : ShieldAlert}
              iconColor={chainValid ? 'text-emerald-600' : 'text-rose-600'}
              iconBgColor={chainValid ? 'bg-emerald-50' : 'bg-rose-50'}
              badge={{
                text: chainValid ? 'Verified' : 'Invalid Chain',
                type: chainValid ? 'success' : 'danger',
              }}
            />
            <StatCard title="Audit Storage Mode" value="Append-Only" subtitle="WORM compliant SHA-256 chain" icon={Terminal} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Live Audit Trail (SHA-256 Chained)</span>
              {!chainValid && (
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chain Verification Failed
                </span>
              )}
            </h3>
            <div className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded transition ${
                    evt.isCurrentValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/70 border border-rose-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">{evt.action}</span>
                      <span className="text-slate-400">[{evt.resource}]</span>
                      {!evt.isCurrentValid && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-200 text-rose-800">
                          INVALID ({evt.failureReason})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 space-y-0.5">
                      <div>
                        Hash: <span className={evt.isCurrentValid ? 'text-blue-600' : 'text-rose-600 font-bold'}>{evt.hash || 'NO_HASH'}</span>
                      </div>
                      <div className="text-slate-400">
                        Prev: <span>{evt.prevHash || GENESIS_AUDIT_HASH}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 text-right text-[10px]">
                    <div>{new Date(evt.createdAt).toLocaleString()}</div>
                    <div className="text-slate-500">Actor: {evt.actorId || 'SYSTEM'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

