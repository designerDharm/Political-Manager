import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';
import { apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate request via session
    const authResult = await requireAuth(req);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { principal } = authResult;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId') || principal.campaignMemberships[0]?.campaignId;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'campaignId is required for realtime event subscription', 400);
    }

    // 2. Enforce Campaign Access
    const access = await requireCampaignAccess(principal, campaignId);
    if ('error' in access) {
      return access.error;
    }

    // 3. Resolve Political Agent booth scope if applicable
    let agentAllowedBooths: string[] | null = null;
    if (principal.platformRole === 'POLITICAL_AGENT') {
      agentAllowedBooths = await getAgentBoothScope(principal, campaignId);
    }

    // Read Last-Event-ID header if client reconnected
    const lastEventId = req.headers.get('last-event-id');
    let lastSeenDate = new Date();

    if (lastEventId) {
      const priorEvent = await prisma.auditEvent.findUnique({
        where: { id: lastEventId },
        select: { createdAt: true },
      });
      if (priorEvent) {
        lastSeenDate = priorEvent.createdAt;
      }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Initial connected handshake packet
        const initData = JSON.stringify({
          time: new Date().toISOString(),
          status: 'CONNECTED',
          campaignId,
          role: principal.platformRole,
        });
        controller.enqueue(encoder.encode(`event: connected\ndata: ${initData}\n\n`));

        let lastCheck = lastSeenDate;
        let isClosed = false;
        let heartbeatCounter = 0;

        const interval = setInterval(async () => {
          if (isClosed) return;
          try {
            // Poll recent AuditEvents for this campaign
            const recentAudits = await prisma.auditEvent.findMany({
              where: {
                campaignId,
                createdAt: { gt: lastCheck },
              },
              orderBy: { createdAt: 'asc' },
              take: 20,
            });

            if (recentAudits.length > 0) {
              lastCheck = recentAudits[recentAudits.length - 1].createdAt;

              for (const audit of recentAudits) {
                // If user is POLITICAL_AGENT, filter out events from booths outside their scope
                if (principal.platformRole === 'POLITICAL_AGENT' && agentAllowedBooths !== null) {
                  let eventDetails: any = {};
                  try {
                    eventDetails = JSON.parse(audit.details || '{}');
                  } catch {
                    eventDetails = {};
                  }

                  // If event has boothId or target booth and does not match scope, suppress event
                  if (eventDetails.boothId && !agentAllowedBooths.includes(eventDetails.boothId)) {
                    continue;
                  }
                  // For assignments, if assignment is for someone else and not this agent, suppress
                  if (audit.action.startsWith('ASSIGNMENT_') && eventDetails.assigneeId && eventDetails.assigneeId !== principal.userId) {
                    continue;
                  }
                }

                // Extract resource type and entityId
                const [entityType, entityId] = (audit.resource || ':').split(':');

                // Minimal safe event payload (zero voter PII)
                const payload = JSON.stringify({
                  eventId: audit.id,
                  type: audit.action,
                  campaignId: audit.campaignId,
                  entityType: entityType || 'general',
                  entityId: entityId || null,
                  changedAt: audit.createdAt.toISOString(),
                });

                const sseFrame = `id: ${audit.id}\nevent: ${audit.action}\ndata: ${payload}\n\n`;
                controller.enqueue(encoder.encode(sseFrame));
              }
            } else {
              // Safe comment heartbeat every ~15 seconds (5 ticks x 3s)
              heartbeatCounter++;
              if (heartbeatCounter >= 5) {
                heartbeatCounter = 0;
                controller.enqueue(encoder.encode(`: ping ${new Date().toISOString()}\n\n`));
              }
            }
          } catch (e) {
            // Keep stream open on transient query glitch
          }
        }, 3000);

        req.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to establish realtime stream', 500, String(err));
  }
}
