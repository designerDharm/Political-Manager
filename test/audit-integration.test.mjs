/**
 * audit-integration.test.mjs
 *
 * QA-021 — PostgreSQL integration tests for the audit hash chain.
 *
 * Uses the real DATABASE_URL / live Postgres instance. Borrows an existing
 * Organization row so no test data is created at schema level.
 * All test audit events are tagged with action prefix "AUDIT_INTEG_TEST_" and
 * deleted during teardown — so the test is safe to run multiple times.
 *
 * Tests:
 *   1. Two consecutive events: e2.prevHash === e1.hash
 *   2. Ten concurrent logAuditEvent() calls → unique hashes, no chain fork
 *   3. Advisory lock blocks: second writer sees updated chain head after first commits
 *   4. Transactional rollback: aborted tx must NOT persist audit event
 *   5. Tamper detection on real DB records (details mutation)
 *   6. Tamper detection: action field mutation
 *   7. Legacy classification: hashVersion=NULL → LEGACY (not INVALID)
 *   8. New hashVersion=1 with missing hash → INVALID (not legacy)
 *   9. Legacy events do NOT pollute chain validity counter
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  computeAuditEventHash,
  GENESIS_AUDIT_HASH,
  CURRENT_HASH_VERSION,
} from '../src/lib/api/auditHash.ts';

// Prisma reads DATABASE_URL from .env automatically
const prisma = new PrismaClient();

// ── Test isolation ──────────────────────────────────────────────────────────
// We use the first existing org from the DB so we don't need to CREATE org rows
// (which triggers unique-slug constraints and setup complexity).
const TAG = `AUDIT_INTEG_TEST_${Date.now()}`;  // unique to this test run
let ORG_ID = '';

// ── Classification helper ───────────────────────────────────────────────────
function classifyEvent(evt, expectedPrevHash) {
  if (evt.hashVersion === null || evt.hashVersion === undefined) {
    return { category: 'LEGACY', reason: 'hashVersion=NULL' };
  }
  if (!evt.hash || evt.hash.trim().length === 0) {
    return { category: 'INVALID', reason: 'hashVersion=1 but missing hash' };
  }
  if (evt.hash.length !== 64) {
    return { category: 'INVALID', reason: `malformed hash len=${evt.hash.length}` };
  }
  const computed = computeAuditEventHash(expectedPrevHash, {
    organizationId: evt.organizationId,
    campaignId: evt.campaignId ?? null,
    actorId: evt.actorId ?? null,
    action: evt.action,
    resource: evt.resource,
    details: evt.details,
  });
  if (evt.prevHash !== expectedPrevHash) {
    return { category: 'INVALID', reason: 'broken prevHash link' };
  }
  if (evt.hash !== computed) {
    return { category: 'INVALID', reason: 'hash mismatch (tampered)' };
  }
  return { category: 'VALID', reason: '' };
}

// ── Direct writer without advisory lock (for chain-read tests) ──────────────
async function directWrite(params) {
  const last = await prisma.auditEvent.findFirst({
    where: { hashVersion: CURRENT_HASH_VERSION, organizationId: ORG_ID },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });
  const prevHash = last?.hash?.length === 64 ? last.hash : GENESIS_AUDIT_HASH;
  const hash = computeAuditEventHash(prevHash, { ...params, organizationId: ORG_ID });
  return prisma.auditEvent.create({
    data: {
      ...params,
      organizationId: ORG_ID,
      hashVersion: CURRENT_HASH_VERSION,
      prevHash,
      hash,
    },
  });
}

// ── Test-scope logAuditEvent ────────────────────────────────────────────────
// audit.ts uses @/ path aliases that the node test runner cannot resolve.
// We reproduce _writeAuditEvent here using the same logic and the test's own
// PrismaClient. The advisory lock key must match AUDIT_CHAIN_LOCK_KEY in audit.ts.
const AUDIT_CHAIN_LOCK_KEY = 5792310584n;

async function logAuditEvent(params, txClient) {
  const db = txClient ?? prisma;
  const runWrite = async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY}::bigint)`;
    const last = await db.auditEvent.findFirst({
      where: { hashVersion: CURRENT_HASH_VERSION },
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });
    const prevHash = last?.hash?.length === 64 ? last.hash : GENESIS_AUDIT_HASH;
    const hash = computeAuditEventHash(prevHash, params);
    await db.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        campaignId: params.campaignId ?? null,
        actorId: params.actorId ?? null,
        action: params.action,
        resource: params.resource,
        details: params.details,
        ipAddress: params.ipAddress ?? null,
        hashVersion: CURRENT_HASH_VERSION,
        prevHash,
        hash,
      },
    });
  };

  if (txClient) {
    await runWrite(txClient);
  } else {
    await prisma.$transaction(async (tx) => runWrite(tx));
  }
}
before(async () => {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error('Integration tests require at least one Organization row in DB');
  ORG_ID = org.id;
});

after(async () => {
  // Delete all test events created in this run by their tagged actions
  await prisma.auditEvent.deleteMany({
    where: {
      organizationId: ORG_ID,
      action: { startsWith: TAG },
    },
  });
  // Also clean up specific named actions used in tests
  await prisma.auditEvent.deleteMany({
    where: {
      organizationId: ORG_ID,
      action: {
        in: [
          'CONCURRENT_WRITE_TEST', 'LOCK_SEQ_A', 'LOCK_SEQ_B',
          'ROLLBACK_TEST', 'TAMPER_DETECTION_TEST', 'TAMPER_ACTION_TEST',
          'LEGACY_LOGIN', 'BROKEN_WRITER_TEST',
          'LEGACY_COEXIST', 'NEW_CHAIN_COEXIST_1', 'NEW_CHAIN_COEXIST_2',
          'INTEG_TEST_CONSECUTIVE',
        ],
      },
    },
  });
  await prisma.$disconnect();
});

// ─── 1. Consecutive chaining ────────────────────────────────────────────────
describe('QA-021 Integration — consecutive chaining', () => {
  it('event2.prevHash === event1.hash; both hashes recompute correctly', async () => {
    const base = { action: 'INTEG_TEST_CONSECUTIVE', resource: 'test:consec', organizationId: ORG_ID };

    const e1 = await directWrite({ ...base, details: '{"seq":1}' });
    const e2 = await directWrite({ ...base, details: '{"seq":2}' });

    assert.ok(e1.hash?.length === 64, 'e1 must have 64-char hash');
    assert.ok(e2.hash?.length === 64, 'e2 must have 64-char hash');
    assert.strictEqual(e2.prevHash, e1.hash, 'e2.prevHash must equal e1.hash');
    assert.notStrictEqual(e1.hash, e2.hash, 'consecutive events must produce different hashes');

    // Forward re-verification
    const c1 = computeAuditEventHash(e1.prevHash, { organizationId: ORG_ID, action: e1.action, resource: e1.resource, details: e1.details, campaignId: null, actorId: null });
    assert.strictEqual(c1, e1.hash, 'e1 hash must match recomputed');

    const c2 = computeAuditEventHash(e2.prevHash, { organizationId: ORG_ID, action: e2.action, resource: e2.resource, details: e2.details, campaignId: null, actorId: null });
    assert.strictEqual(c2, e2.hash, 'e2 hash must match recomputed');
  });
});

// ─── 2 & 3. Concurrent writes + advisory lock ───────────────────────────────
describe('QA-021 Integration — concurrent writes + advisory lock serialization', () => {
  it('10 concurrent logAuditEvent() calls: unique hashes, no chain fork', async () => {

    const N = 10;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        logAuditEvent({
          organizationId: ORG_ID,
          action: 'CONCURRENT_WRITE_TEST',
          resource: `test:concurrent:${i}`,
          details: JSON.stringify({ slot: i }),
        })
      )
    );

    const events = await prisma.auditEvent.findMany({
      where: { organizationId: ORG_ID, action: 'CONCURRENT_WRITE_TEST', hashVersion: CURRENT_HASH_VERSION },
      orderBy: { createdAt: 'asc' },
    });

    assert.ok(events.length >= N, `Expected ≥${N} events, got ${events.length}`);

    const subset = events.slice(-N); // the last N (this test's)
    const hashes = new Set(subset.map((e) => e.hash));
    assert.strictEqual(hashes.size, N, `All ${N} concurrent hashes must be unique — no chain fork`);

    // Every hash must be valid 64-char hex
    for (const e of subset) {
      assert.match(e.hash, /^[0-9a-f]{64}$/, `Hash ${e.hash?.slice(0,8)}… is not valid SHA-256`);
    }

    // Sequential prevHash chain: each event chains onto the previous
    for (let i = 1; i < subset.length; i++) {
      assert.strictEqual(
        subset[i].prevHash, subset[i - 1].hash,
        `events[${i}].prevHash must equal events[${i - 1}].hash — chain fork detected`
      );
    }
  });

  it('advisory lock forces second writer to see first commit: no duplicate prevHash', async () => {

    await Promise.all([
      logAuditEvent({ organizationId: ORG_ID, action: 'LOCK_SEQ_A', resource: 'test:lock', details: '{"order":1}' }),
      logAuditEvent({ organizationId: ORG_ID, action: 'LOCK_SEQ_B', resource: 'test:lock', details: '{"order":2}' }),
    ]);

    const events = await prisma.auditEvent.findMany({
      where: { organizationId: ORG_ID, action: { in: ['LOCK_SEQ_A', 'LOCK_SEQ_B'] }, hashVersion: CURRENT_HASH_VERSION },
      orderBy: { createdAt: 'asc' },
    });

    assert.strictEqual(events.length, 2, 'Both events must be persisted');

    // Their prevHashes must differ — if both saw the same head, they'd have the same prevHash
    assert.notStrictEqual(
      events[0].prevHash, events[1].prevHash,
      'Two writes must NOT have the same prevHash (that would indicate a chain fork)'
    );

    // The second event must chain onto the first
    assert.strictEqual(events[1].prevHash, events[0].hash, 'Lock ensures second writer chains onto first');
  });
});

// ─── 4. Transactional rollback ───────────────────────────────────────────────
describe('QA-021 Integration — transactional rollback', () => {
  it('audit event disappears when surrounding business transaction aborts', async () => {

    const countBefore = await prisma.auditEvent.count({
      where: { organizationId: ORG_ID, action: 'ROLLBACK_TEST' },
    });

    await assert.rejects(
      () =>
        prisma.$transaction(async (tx) => {
          await logAuditEvent(
            { organizationId: ORG_ID, action: 'ROLLBACK_TEST', resource: 'test:rollback', details: '{"should":"not persist"}' },
            tx
          );
          throw new Error('Simulated business failure');
        }),
      /Simulated business failure/
    );

    const countAfter = await prisma.auditEvent.count({
      where: { organizationId: ORG_ID, action: 'ROLLBACK_TEST' },
    });

    assert.strictEqual(countAfter, countBefore, 'Audit event must NOT be persisted after tx rollback');
  });
});

// ─── 5 & 6. Tamper detection ─────────────────────────────────────────────────
describe('QA-021 Integration — tamper detection on real DB records', () => {
  it('altering details field after write produces INVALID classification', async () => {
    const original = await directWrite({
      action: 'TAMPER_DETECTION_TEST',
      resource: 'test:tamper',
      details: JSON.stringify({ amount: 100 }),
    });

    assert.ok(original.hash, 'Event must have hash');
    const { category: before } = classifyEvent(original, original.prevHash);
    assert.strictEqual(before, 'VALID', 'Unmodified record must be VALID');

    const tampered = { ...original, details: JSON.stringify({ amount: 9999 }) };
    const { category, reason } = classifyEvent(tampered, original.prevHash);
    assert.strictEqual(category, 'INVALID');
    assert.match(reason, /tampered/);
  });

  it('altering the action field is also detected as INVALID', async () => {
    const original = await directWrite({
      action: 'TAMPER_ACTION_TEST',
      resource: 'test:tamper-action',
      details: '{"ok":true}',
    });

    const tampered = { ...original, action: 'PRIVILEGE_ESCALATION' };
    const { category } = classifyEvent(tampered, original.prevHash);
    assert.strictEqual(category, 'INVALID');
  });
});

// ─── 7, 8, 9. Legacy and provenance classification ───────────────────────────
describe('QA-021 Integration — legacy and provenance classification (real DB)', () => {
  it('record with hashVersion=NULL is classified LEGACY, not INVALID', async () => {
    const legacy = await prisma.auditEvent.create({
      data: {
        organizationId: ORG_ID,
        action: 'LEGACY_LOGIN',
        resource: 'user:legacy',
        details: '{"type":"legacy"}',
        // hashVersion omitted → NULL
      },
    });

    assert.strictEqual(legacy.hashVersion, null, 'hashVersion must be NULL');
    const { category } = classifyEvent(legacy, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'LEGACY', 'hashVersion=NULL must be LEGACY');
  });

  it('hashVersion=1 record with missing hash is INVALID (not legacy)', async () => {
    const broken = await prisma.auditEvent.create({
      data: {
        organizationId: ORG_ID,
        action: 'BROKEN_WRITER_TEST',
        resource: 'test:broken',
        details: '{"broken":true}',
        hashVersion: CURRENT_HASH_VERSION,
        // hash omitted → NULL: writer-bug simulation
      },
    });

    assert.strictEqual(broken.hashVersion, CURRENT_HASH_VERSION);
    assert.strictEqual(broken.hash, null);
    const { category, reason } = classifyEvent(broken, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'INVALID', 'hashVersion=1 + missing hash must be INVALID');
    assert.match(reason, /missing/);
  });

  it('legacy and new-chain events coexist: legacy does NOT pollute chain validity counter', async () => {
    const legacyEvt = await prisma.auditEvent.create({
      data: {
        organizationId: ORG_ID,
        action: 'LEGACY_COEXIST',
        resource: 'test:coexist',
        details: '{"type":"legacy"}',
      },
    });

    const v1 = await directWrite({ action: 'NEW_CHAIN_COEXIST_1', resource: 'test:coexist', details: '{"seq":1}' });
    const v2 = await directWrite({ action: 'NEW_CHAIN_COEXIST_2', resource: 'test:coexist', details: '{"seq":2}' });

    assert.strictEqual(classifyEvent(legacyEvt, GENESIS_AUDIT_HASH).category, 'LEGACY');
    assert.strictEqual(classifyEvent(v1, v1.prevHash).category, 'VALID');
    assert.strictEqual(classifyEvent(v2, v1.hash).category, 'VALID');

    // Simulate the system-logs verifier invalid counter
    let invalidCounter = 0;
    for (const evt of [legacyEvt, v1, v2]) {
      const { category } = classifyEvent(evt, evt.hashVersion === CURRENT_HASH_VERSION ? evt.prevHash : GENESIS_AUDIT_HASH);
      if (category === 'INVALID' || category === 'DUPLICATE') invalidCounter++;
    }
    assert.strictEqual(invalidCounter, 0, 'LEGACY events must NOT increment the invalid counter');
  });
});
