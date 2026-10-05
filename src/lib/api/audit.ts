/**
 * audit.ts — Canonical audit event writer.
 *
 * Guarantees:
 * 1. Hash chaining: every new record's prevHash links to the previous record's hash.
 * 2. Serialization: a PostgreSQL advisory lock (`pg_advisory_xact_lock`) is
 *    acquired inside the transaction before reading the chain head and writing
 *    the new event. This prevents concurrent chain forks — two simultaneous
 *    callers cannot both see the same "last hash" and create duplicate prevHash
 *    links. The lock is released automatically when the transaction commits or
 *    rolls back.
 * 3. Transactional consistency: callers inside a Prisma `$transaction` may
 *    pass their TransactionClient so the audit event commits or rolls back
 *    with the surrounding business change.
 * 4. Provenance: every new record carries hashVersion = CURRENT_HASH_VERSION.
 *    Records with hashVersion = NULL are legacy (pre-versioning, preserved
 *    unchanged). A new record with hashVersion = 1 but a bad/missing hash is
 *    classified INVALID, not legacy.
 */

import { PrismaClient } from '@prisma/client';
import { prisma as globalPrisma } from '@/lib/prisma';
import {
  computeAuditEventHash,
  GENESIS_AUDIT_HASH,
  CURRENT_HASH_VERSION,
  type AuditHashPayload,
} from './auditHash';

export { computeAuditEventHash, GENESIS_AUDIT_HASH, CURRENT_HASH_VERSION };
export type { AuditHashPayload };

/**
 * A fixed 64-bit integer key used for the pg_advisory_xact_lock that
 * serializes audit chain appends. Value is arbitrary but must be constant
 * across all writers.
 *
 * pg_advisory_xact_lock accepts bigint. 5792310584 fits in a 32-bit int,
 * which Postgres casts to bigint safely.
 */
const AUDIT_CHAIN_LOCK_KEY = 5792310584;

// Accept either the global PrismaClient or a transaction-scoped client.
// Prisma's TransactionClient exposes the same model delegates as PrismaClient.
type AuditClient = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface LogAuditEventParams extends AuditHashPayload {
  ipAddress?: string | null;
}

/**
 * Write a tamper-evident, hash-chained audit event.
 *
 * @param params   Audit event fields.
 * @param txClient Optional Prisma transaction client. When provided, the audit
 *                 event is written within the caller's transaction — it will
 *                 roll back if the transaction is aborted. The advisory lock
 *                 is still acquired to prevent chain forks from concurrent
 *                 transactions.
 */
export async function logAuditEvent(
  params: LogAuditEventParams,
  txClient?: AuditClient
): Promise<void> {
  try {
    // If no tx client provided, run in a dedicated serializable transaction.
    if (!txClient) {
      await globalPrisma.$transaction(async (tx) => {
        await _writeAuditEvent(params, tx as AuditClient);
      });
    } else {
      await _writeAuditEvent(params, txClient);
    }
  } catch (err) {
    // Audit failures must never crash the primary business operation.
    console.error('[audit] logAuditEvent failed — event will NOT be recorded:', err);
  }
}

async function _writeAuditEvent(
  params: LogAuditEventParams,
  db: AuditClient
): Promise<void> {
  // 1. Acquire session-level advisory lock to serialize chain appends.
  //    pg_advisory_xact_lock blocks until all other holders release it.
  //    It is automatically released when this transaction commits/rolls-back.
  await (db as any).$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY}::bigint)`;

  // 2. Read the current chain head — now safe because we hold the lock.
  const lastEvent = await (db as any).auditEvent.findFirst({
    where: { hashVersion: CURRENT_HASH_VERSION },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  const prevHash =
    lastEvent?.hash && lastEvent.hash.trim().length === 64
      ? lastEvent.hash.trim()
      : GENESIS_AUDIT_HASH;

  // 3. Compute the new hash over prevHash + canonical payload.
  const currentHash = computeAuditEventHash(prevHash, params);

  // 4. Persist.
  await (db as any).auditEvent.create({
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
      hash: currentHash,
    },
  });
}
