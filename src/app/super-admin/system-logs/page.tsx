import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Terminal,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { computeAuditEventHash, GENESIS_AUDIT_HASH, CURRENT_HASH_VERSION } from '@/lib/api/audit';

export const revalidate = 0;

type EventCategory = 'VALID' | 'LEGACY' | 'DUPLICATE' | 'INVALID';

export default async function SuperAdminSystemLogsPage() {
  const auditEvents = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const total = auditEvents.length;

  // ─── Chain Verification ────────────────────────────────────────────────────
  // Only SHA-256 records (hashVersion = CURRENT_HASH_VERSION) form the verified
  // chain. Legacy records (hashVersion = NULL) are preserved unchanged and are
  // NOT counted against chain validity.
  const seenHashes = new Set<string>();
  let invalidCount = 0;
  let duplicateCount = 0;

  // Build the expected chain using only versioned records, in order.
  const versionedEvents = auditEvents.filter(
    (e) => e.hashVersion === CURRENT_HASH_VERSION
  );

  const verifiedEvents = auditEvents.map((evt) => {
    let category: EventCategory = 'VALID';
    let failureReason = '';

    // ── Legacy: explicit provenance marker (hashVersion = NULL) ──────────────
    if (evt.hashVersion === null || evt.hashVersion === undefined) {
      category = 'LEGACY';
      failureReason = 'Legacy record (hashVersion = NULL, pre-SHA-256 migration)';
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    // ── Current-version records must have a valid 64-char SHA-256 hash ──────
    if (!evt.hash || evt.hash.trim().length === 0) {
      // hashVersion = 1 but no hash → writer bug / NEW invalid record
      category = 'INVALID';
      failureReason = `hashVersion=${evt.hashVersion} record is missing its hash — writer error or tampering`;
      invalidCount++;
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    if (evt.hash.length !== 64) {
      // hashVersion = 1 but malformed hash → invalid, not legacy
      category = 'INVALID';
      failureReason = `hashVersion=${evt.hashVersion} record has malformed hash (length=${evt.hash.length})`;
      invalidCount++;
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    if (seenHashes.has(evt.hash)) {
      category = 'DUPLICATE';
      duplicateCount++;
      failureReason = 'Duplicate hash detected — possible chain fork or replay';
      invalidCount++;
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    seenHashes.add(evt.hash);

    // Determine expected prevHash by finding the previous versioned event
    const positionInVersioned = versionedEvents.findIndex((e) => e.id === evt.id);
    const previousVersioned = positionInVersioned > 0 ? versionedEvents[positionInVersioned - 1] : null;
    const expectedPrev = previousVersioned?.hash ?? GENESIS_AUDIT_HASH;

    if (evt.prevHash !== expectedPrev) {
      category = 'INVALID';
      failureReason = `Broken chain link: expected prevHash …${expectedPrev.slice(-8)} but got …${(evt.prevHash ?? '').slice(-8)}`;
      invalidCount++;
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    const computed = computeAuditEventHash(evt.prevHash ?? GENESIS_AUDIT_HASH, {
      organizationId: evt.organizationId,
      campaignId: evt.campaignId,
      actorId: evt.actorId,
      action: evt.action,
      resource: evt.resource,
      details: evt.details,
    });

    if (evt.hash !== computed) {
      category = 'INVALID';
      failureReason = 'Hash mismatch — payload has been tampered with';
      invalidCount++;
      return { ...evt, category, isCurrentValid: false, failureReason };
    }

    return { ...evt, category, isCurrentValid: true, failureReason: '' };
  });

  // ─── Counts ────────────────────────────────────────────────────────────────
  const legacyCount = verifiedEvents.filter((e) => e.category === 'LEGACY').length;
  const verifiedCount = verifiedEvents.filter((e) => e.category === 'VALID').length;
  // Coverage = records that have been run through verification (versioned only)
  const verifiableCount = versionedEvents.length;
  const coveragePct = total > 0 ? Math.round((verifiableCount / total) * 100) : 0;
  const chainIntact = invalidCount === 0 && duplicateCount === 0;

  // Checked range description
  const firstVersioned = versionedEvents[0];
  const lastVersioned = versionedEvents[versionedEvents.length - 1];
  const rangeLabel = firstVersioned && lastVersioned
    ? `${new Date(firstVersioned.createdAt).toLocaleDateString()} → ${new Date(lastVersioned.createdAt).toLocaleDateString()}`
    : 'No versioned records';

  // Display latest 30 in descending order
  const displayEvents = [...verifiedEvents].reverse().slice(0, 30);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                System Logs &amp; Cryptographic Audit Trails
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Append-only audit trail protected with SHA-256 hash chaining.{' '}
                <span className="font-semibold">
                  Coverage: {verifiableCount}/{total} records verified ({coveragePct}%)
                </span>
                {firstVersioned && (
                  <span className="ml-2 text-slate-400">· Checked range: {rangeLabel}</span>
                )}
              </p>
            </div>
          </div>

          {/* ── Top Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              title="Total Events"
              value={total.toString()}
              subtitle="All time"
              icon={FileText}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="SHA-256 Verified"
              value={verifiedCount.toString()}
              subtitle={`hashVersion=${CURRENT_HASH_VERSION}, valid`}
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
            />
            <StatCard
              title="Invalid / Tampered"
              value={invalidCount.toString()}
              subtitle={`${duplicateCount} duplicate hashes`}
              icon={ShieldAlert}
              iconColor={invalidCount > 0 ? 'text-rose-600' : 'text-slate-400'}
              iconBgColor={invalidCount > 0 ? 'bg-rose-50' : 'bg-slate-50'}
              badge={
                invalidCount > 0
                  ? { text: 'CHAIN BROKEN', type: 'danger' as const }
                  : undefined
              }
            />
            <StatCard
              title="Legacy Records"
              value={legacyCount.toString()}
              subtitle="hashVersion=NULL, pre-migration"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Coverage"
              value={`${coveragePct}%`}
              subtitle={`${verifiableCount} of ${total} verifiable`}
              icon={Shield}
              iconColor={coveragePct === 100 ? 'text-emerald-600' : 'text-blue-600'}
              iconBgColor={coveragePct === 100 ? 'bg-emerald-50' : 'bg-blue-50'}
            />
            <StatCard
              title="Chain Status"
              value={
                verifiableCount === 0
                  ? 'No chain'
                  : chainIntact
                  ? coveragePct === 100
                    ? '100% Valid'
                    : `Valid (${coveragePct}% covered)`
                  : `${invalidCount} anomal${invalidCount === 1 ? 'y' : 'ies'}`
              }
              subtitle={
                verifiableCount === 0
                  ? 'No SHA-256 records yet'
                  : chainIntact && coveragePct < 100
                  ? `${legacyCount} legacy records not in chain`
                  : chainIntact
                  ? 'Zero hash breaks or duplicates'
                  : `${duplicateCount} duplicates`
              }
              icon={chainIntact && verifiableCount > 0 ? CheckCircle2 : ShieldAlert}
              iconColor={
                verifiableCount === 0
                  ? 'text-slate-400'
                  : chainIntact
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }
              iconBgColor={
                verifiableCount === 0
                  ? 'bg-slate-50'
                  : chainIntact
                  ? 'bg-emerald-50'
                  : 'bg-rose-50'
              }
              badge={
                verifiableCount === 0
                  ? { text: 'No chain', type: 'info' as const }
                  : chainIntact && coveragePct === 100
                  ? { text: 'Fully Verified', type: 'success' as const }
                  : chainIntact
                  ? { text: `Partial (${coveragePct}%)`, type: 'info' as const }
                  : { text: 'Chain Broken', type: 'danger' as const }
              }
            />
          </div>

          {/* ── Coverage Warning Banner ── */}
          {coveragePct < 100 && total > 0 && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <span className="font-bold">Incomplete coverage:</span> {legacyCount} legacy record{legacyCount !== 1 ? 's' : ''} (hashVersion=NULL)
                and {total - verifiableCount - legacyCount} other records are not part of the SHA-256 chain.
                Chain integrity can only be confirmed for the {verifiableCount} versioned record{verifiableCount !== 1 ? 's' : ''} in range{' '}
                <span className="font-mono">{rangeLabel}</span>.
              </div>
            </div>
          )}

          {/* ── Event Feed ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Live Audit Trail (SHA-256 Chained — latest 30)</span>
              {invalidCount > 0 && (
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chain Verification Failed
                </span>
              )}
            </h3>
            <div className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayEvents.map((evt) => {
                const rowBg =
                  evt.category === 'INVALID' || evt.category === 'DUPLICATE'
                    ? 'bg-rose-50/70 border border-rose-200'
                    : evt.category === 'LEGACY'
                    ? 'bg-amber-50/50 border border-amber-100'
                    : 'hover:bg-slate-50/50';

                const badgeEl =
                  evt.category === 'INVALID' || evt.category === 'DUPLICATE' ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-200 text-rose-800">
                      {evt.category} — {evt.failureReason}
                    </span>
                  ) : evt.category === 'LEGACY' ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-200 text-amber-800">
                      LEGACY (pre-SHA-256, not verified)
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-100 text-emerald-700">
                      ✓ VALID v{evt.hashVersion}
                    </span>
                  );

                const hashColor =
                  evt.category === 'INVALID' || evt.category === 'DUPLICATE'
                    ? 'text-rose-600 font-bold'
                    : evt.category === 'LEGACY'
                    ? 'text-slate-400 italic'
                    : 'text-blue-600';

                return (
                  <div
                    key={evt.id}
                    className={`py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-2 rounded transition ${rowBg}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs">{evt.action}</span>
                        <span className="text-slate-400">[{evt.resource}]</span>
                        {badgeEl}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 space-y-0.5">
                        <div>
                          Hash:{' '}
                          <span className={hashColor}>
                            {evt.hash ? `${evt.hash.slice(0, 16)}…` : 'NO_HASH'}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Prev:{' '}
                          <span>
                            {evt.prevHash
                              ? `${evt.prevHash.slice(0, 16)}…`
                              : evt.hashVersion === CURRENT_HASH_VERSION
                              ? GENESIS_AUDIT_HASH.slice(0, 16) + '… (genesis)'
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-400 text-right text-[10px] shrink-0">
                      <div>{new Date(evt.createdAt).toLocaleString()}</div>
                      <div className="text-slate-500">Actor: {evt.actorId || 'SYSTEM'}</div>
                    </div>
                  </div>
                );
              })}
              {displayEvents.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No audit events recorded yet.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
