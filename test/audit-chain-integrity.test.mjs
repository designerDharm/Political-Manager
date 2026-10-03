/**
 * audit-chain-integrity.test.mjs
 *
 * QA-021 — Integration tests for SHA-256 audit hash chaining.
 * Verifies:
 *   1. Two consecutive events chain correctly (prevHash links)
 *   2. Concurrent writes do not collide (each hash is unique)
 *   3. Tamper detection: mutating a stored event breaks the expected hash
 *   4. Legacy (pre-SHA-256) records are classified LEGACY, not INVALID
 *   5. Unverified (no hash) records are classified UNVERIFIED, not INVALID
 *
 * Uses Node's built-in test runner and --experimental-strip-types.
 * Imports only from auditHash.ts (no Prisma, no network).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure import — no Prisma, safe for test runner
import {
  computeAuditEventHash,
  GENESIS_AUDIT_HASH,
} from '../src/lib/api/auditHash.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePayload(overrides = {}) {
  return {
    organizationId: 'org-test-001',
    campaignId: 'camp-test-001',
    actorId: 'user-test-001',
    action: 'TEST_ACTION',
    resource: 'Test:1',
    details: JSON.stringify({ note: 'test' }),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('computeAuditEventHash — pure hash function', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = computeAuditEventHash(GENESIS_AUDIT_HASH, makePayload());
    assert.strictEqual(typeof hash, 'string', 'hash should be a string');
    assert.strictEqual(hash.length, 64, 'SHA-256 hex digest must be 64 chars');
    assert.match(hash, /^[0-9a-f]{64}$/, 'hash must be lowercase hex');
  });

  it('GENESIS_AUDIT_HASH is a 64-character zero string', () => {
    assert.strictEqual(GENESIS_AUDIT_HASH.length, 64);
    assert.match(GENESIS_AUDIT_HASH, /^0{64}$/);
  });
});

describe('QA-021 — Two consecutive events chain correctly', () => {
  it('event2.prevHash === event1.hash', () => {
    const payload1 = makePayload({ action: 'EVENT_ONE' });
    const hash1 = computeAuditEventHash(GENESIS_AUDIT_HASH, payload1);

    const payload2 = makePayload({ action: 'EVENT_TWO' });
    const hash2 = computeAuditEventHash(hash1, payload2);

    // chain link: hash2 must have been derived from hash1
    const recomputed = computeAuditEventHash(hash1, payload2);
    assert.strictEqual(recomputed, hash2, 'recomputed hash must equal stored hash2');

    // verify that using GENESIS as prevHash for event2 produces a DIFFERENT hash
    const wrongPrev = computeAuditEventHash(GENESIS_AUDIT_HASH, payload2);
    assert.notStrictEqual(wrongPrev, hash2, 'wrong prevHash must produce different hash');
  });

  it('chain is verifiable in sequence', () => {
    const events = [];
    let prevHash = GENESIS_AUDIT_HASH;

    for (let i = 0; i < 5; i++) {
      const payload = makePayload({ action: `ACTION_${i}`, details: JSON.stringify({ seq: i }) });
      const hash = computeAuditEventHash(prevHash, payload);
      events.push({ prevHash, hash, payload });
      prevHash = hash;
    }

    // Now verify the full chain forward
    let expectedPrev = GENESIS_AUDIT_HASH;
    for (const evt of events) {
      assert.strictEqual(evt.prevHash, expectedPrev, `prevHash must equal previous hash at ${evt.payload.action}`);
      const recomputed = computeAuditEventHash(evt.prevHash, evt.payload);
      assert.strictEqual(recomputed, evt.hash, `hash must match recomputed hash at ${evt.payload.action}`);
      expectedPrev = evt.hash;
    }
  });
});

describe('QA-021 — Concurrent writes (hash uniqueness)', () => {
  it('concurrent events with different payloads produce unique hashes', () => {
    // Simulate two simultaneous writes starting from the same prevHash
    const sharedPrev = GENESIS_AUDIT_HASH;
    const payloadA = makePayload({ action: 'CONCURRENT_A', actorId: 'user-A' });
    const payloadB = makePayload({ action: 'CONCURRENT_B', actorId: 'user-B' });

    const hashA = computeAuditEventHash(sharedPrev, payloadA);
    const hashB = computeAuditEventHash(sharedPrev, payloadB);

    assert.notStrictEqual(hashA, hashB, 'concurrent events must have different hashes');
    assert.strictEqual(hashA.length, 64);
    assert.strictEqual(hashB.length, 64);
  });

  it('same payload + same prevHash always produces the same hash (determinism)', () => {
    const payload = makePayload();
    const h1 = computeAuditEventHash(GENESIS_AUDIT_HASH, payload);
    const h2 = computeAuditEventHash(GENESIS_AUDIT_HASH, payload);
    assert.strictEqual(h1, h2, 'hash must be deterministic for same input');
  });
});

describe('QA-021 — Tamper detection', () => {
  it('mutating event details produces a different hash (tamper detected)', () => {
    const originalPayload = makePayload({ details: JSON.stringify({ amount: 100 }) });
    const storedHash = computeAuditEventHash(GENESIS_AUDIT_HASH, originalPayload);

    // Attacker modifies the stored event record
    const tamperedPayload = { ...originalPayload, details: JSON.stringify({ amount: 9999 }) };
    const recomputed = computeAuditEventHash(GENESIS_AUDIT_HASH, tamperedPayload);

    assert.notStrictEqual(recomputed, storedHash, 'tampered payload must not match stored hash');
  });

  it('mutating action field is also detected', () => {
    const original = makePayload({ action: 'LOGIN_SUCCESS' });
    const storedHash = computeAuditEventHash(GENESIS_AUDIT_HASH, original);

    const tampered = { ...original, action: 'GRANT_SUPER_ADMIN' };
    const recomputed = computeAuditEventHash(GENESIS_AUDIT_HASH, tampered);

    assert.notStrictEqual(recomputed, storedHash, 'mutated action must break hash match');
  });

  it('mutating organizationId is detected', () => {
    const original = makePayload({ organizationId: 'org-real' });
    const storedHash = computeAuditEventHash(GENESIS_AUDIT_HASH, original);

    const tampered = { ...original, organizationId: 'org-attacker' };
    const recomputed = computeAuditEventHash(GENESIS_AUDIT_HASH, tampered);

    assert.notStrictEqual(recomputed, storedHash);
  });
});

describe('QA-021 — Legacy and unverified record classification (verifier logic)', () => {
  /**
   * These tests exercise the *classification logic* that lives in system-logs/page.tsx.
   * We inline the classification function here to test it in isolation (no Prisma needed).
   */

  function classifyEvent(evt, prevStoredHash) {
    // Mirrors the verifier in system-logs/page.tsx
    if (!evt.hash || evt.hash.trim().length === 0) {
      return { category: 'UNVERIFIED', failureReason: 'No hash recorded (pre-hashing era)' };
    }
    if (evt.hash.length !== 64) {
      return { category: 'LEGACY', failureReason: 'Legacy record (pre-SHA-256 migration)' };
    }
    // Recompute
    const computed = computeAuditEventHash(evt.prevHash || GENESIS_AUDIT_HASH, {
      organizationId: evt.organizationId,
      campaignId: evt.campaignId,
      actorId: evt.actorId,
      action: evt.action,
      resource: evt.resource,
      details: evt.details,
    });
    if (evt.hash !== computed) {
      return { category: 'INVALID', failureReason: 'Hash mismatch against canonical payload (tamper detected)' };
    }
    return { category: 'VALID', failureReason: '' };
  }

  it('event with no hash is classified UNVERIFIED (not INVALID)', () => {
    const evt = { hash: null, prevHash: null, ...makePayload() };
    const { category } = classifyEvent(evt, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'UNVERIFIED');
  });

  it('event with empty string hash is classified UNVERIFIED', () => {
    const evt = { hash: '', prevHash: '', ...makePayload() };
    const { category } = classifyEvent(evt, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'UNVERIFIED');
  });

  it('event with 16-char legacy hash is classified LEGACY (not INVALID)', () => {
    const evt = { hash: 'abcd1234efgh5678', prevHash: null, ...makePayload() };
    const { category } = classifyEvent(evt, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'LEGACY', 'short hash must be LEGACY, never INVALID');
  });

  it('new SHA-256 event with correct hash is classified VALID', () => {
    const payload = makePayload();
    const hash = computeAuditEventHash(GENESIS_AUDIT_HASH, payload);
    const evt = { hash, prevHash: GENESIS_AUDIT_HASH, ...payload };
    const { category } = classifyEvent(evt, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'VALID');
  });

  it('new SHA-256 event with tampered details is classified INVALID', () => {
    const original = makePayload({ details: JSON.stringify({ value: 'real' }) });
    const hash = computeAuditEventHash(GENESIS_AUDIT_HASH, original);
    // Stored event has been tampered
    const tamperedEvt = {
      hash,
      prevHash: GENESIS_AUDIT_HASH,
      ...original,
      details: JSON.stringify({ value: 'tampered' }),
    };
    const { category } = classifyEvent(tamperedEvt, GENESIS_AUDIT_HASH);
    assert.strictEqual(category, 'INVALID');
  });

  it('legacy chain: LEGACY events do not pollute chain validity counter', () => {
    // Simulate the verifier loop with one legacy + one valid event
    const legacyEvt = { hash: 'oldHash12345678x', prevHash: null, ...makePayload({ action: 'LEGACY_LOGIN' }) };
    const validPayload = makePayload({ action: 'VALID_LOGIN' });
    const validHash = computeAuditEventHash(GENESIS_AUDIT_HASH, validPayload);
    const validEvt = { hash: validHash, prevHash: GENESIS_AUDIT_HASH, ...validPayload };

    let invalidCount = 0;
    for (const evt of [legacyEvt, validEvt]) {
      const { category } = classifyEvent(evt, GENESIS_AUDIT_HASH);
      if (category === 'INVALID' || category === 'DUPLICATE') invalidCount++;
    }

    assert.strictEqual(invalidCount, 0, 'LEGACY events must not increment invalid counter');
  });
});
