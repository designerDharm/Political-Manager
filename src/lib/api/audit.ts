import { prisma } from '@/lib/prisma';
import { computeAuditEventHash, GENESIS_AUDIT_HASH } from './auditHash';

export { computeAuditEventHash, GENESIS_AUDIT_HASH };

export async function logAuditEvent(params: {
  organizationId: string;
  campaignId?: string | null;
  actorId?: string | null;
  action: string;
  resource: string;
  details: string;
  ipAddress?: string | null;
}) {
  try {
    // Tamper-evident cryptographic SHA-256 hash chaining
    const lastEvent = await prisma.auditEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const prevHash = lastEvent?.hash && lastEvent.hash.trim().length > 0
      ? lastEvent.hash.trim()
      : GENESIS_AUDIT_HASH;

    const currentHash = computeAuditEventHash(prevHash, params);

    return await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        campaignId: params.campaignId,
        actorId: params.actorId,
        action: params.action,
        resource: params.resource,
        details: params.details,
        ipAddress: params.ipAddress,
        prevHash,
        hash: currentHash,
      },
    });
  } catch (err) {
    console.error('Audit event failed to record:', err);
  }
}

