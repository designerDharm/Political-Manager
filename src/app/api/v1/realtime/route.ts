import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection packet
      const initPayload = `event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString(), status: 'STREAM_CONNECTED' })}\n\n`;
      controller.enqueue(encoder.encode(initPayload));

      // Stream interval heartbeat and outbox events
      let lastCheck = new Date();

      const interval = setInterval(async () => {
        try {
          const recentAudits = await prisma.auditEvent.findMany({
            where: {
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: 'asc' },
            take: 10,
          });

          if (recentAudits.length > 0) {
            lastCheck = new Date();
            for (const audit of recentAudits) {
              const msg = `event: mutation\ndata: ${JSON.stringify({
                action: audit.action,
                resource: audit.resource,
                time: audit.createdAt,
              })}\n\n`;
              controller.enqueue(encoder.encode(msg));
            }
          } else {
            // Heartbeat
            controller.enqueue(encoder.encode(`event: ping\ndata: "${new Date().toISOString()}"\n\n`));
          }
        } catch (e) {
          // Keep stream open on minor transient query delays
        }
      }, 3000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
}
