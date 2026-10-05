/**
 * auditHash.ts — Pure cryptographic helpers for audit event hash chaining.
 *
 * NO Prisma dependency. Safe to import in Node test runner without path-alias
 * resolution. All Prisma interaction lives in audit.ts.
 */
import crypto from 'crypto';

/**
 * Provenance version written to AuditEvent.hashVersion for all new records.
 * NULL in the DB means legacy (pre-versioning). A new record with a missing
 * or malformed hash and hashVersion = 1 is INVALID, not legacy.
 */
export const CURRENT_HASH_VERSION = 1;

/**
 * The virtual "previous hash" used for the very first event in the chain.
 * 64 zero-hex characters (SHA-256 of empty string would be e3b0c4…, but we
 * use all-zeros as the explicit genesis sentinel to distinguish from a real hash).
 */
export const GENESIS_AUDIT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditHashPayload {
  organizationId: string;
  campaignId?: string | null;
  actorId?: string | null;
  action: string;
  resource: string;
  details: string;
}

/**
 * Compute a deterministic SHA-256 hash over prevHash + canonical JSON payload.
 * The canonical form omits fields that are not part of the integrity-protected
 * data (e.g., ipAddress, createdAt) to avoid hash instability.
 */
export function computeAuditEventHash(prevHash: string, payload: AuditHashPayload): string {
  const safePrevHash =
    prevHash && prevHash.trim().length > 0 ? prevHash.trim() : GENESIS_AUDIT_HASH;

  const canonicalPayload = JSON.stringify({
    organizationId: payload.organizationId,
    campaignId: payload.campaignId ?? null,
    actorId: payload.actorId ?? null,
    action: payload.action,
    resource: payload.resource,
    details: payload.details,
  });

  return crypto
    .createHash('sha256')
    .update(`${safePrevHash}:${canonicalPayload}`)
    .digest('hex');
}
