import { prisma } from '@/lib/prisma';

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
    // Tamper-evident hash chaining
    const lastEvent = await prisma.auditEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const prevHash = lastEvent?.hash || '00000000000000000000000000000000';
    const rawContent = `${prevHash}:${params.organizationId}:${params.action}:${params.resource}:${Date.now()}`;
    
    // Simple deterministic hash representation
    let hash = 0;
    for (let i = 0; i < rawContent.length; i++) {
      const char = rawContent.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const currentHash = Math.abs(hash).toString(16).padStart(16, '0');

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
