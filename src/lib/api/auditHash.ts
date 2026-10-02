import crypto from 'crypto';

export const GENESIS_AUDIT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeAuditEventHash(prevHash: string, payload: {
  organizationId: string;
  campaignId?: string | null;
  actorId?: string | null;
  action: string;
  resource: string;
  details: string;
  timestamp?: string | number | Date;
}): string {
  const safePrevHash = prevHash && prevHash.trim().length > 0 ? prevHash.trim() : GENESIS_AUDIT_HASH;
  const canonicalPayload = JSON.stringify({
    organizationId: payload.organizationId,
    campaignId: payload.campaignId || null,
    actorId: payload.actorId || null,
    action: payload.action,
    resource: payload.resource,
    details: payload.details,
  });

  return crypto
    .createHash('sha256')
    .update(`${safePrevHash}:${canonicalPayload}`)
    .digest('hex');
}
