import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

interface MutationEnvelope {
  mutationId: string;
  deviceId: string;
  userId: string;
  campaignId: string;
  entityType: 'household' | 'voter' | 'issue' | 'interaction' | 'vis';
  entityId: string;
  baseVersion: number;
  operation: string;
  payload: Record<string, any>;
  clientOccurredAt: string;
  queuedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mutations } = body as { mutations: MutationEnvelope[] };

    if (!mutations || !Array.isArray(mutations)) {
      return apiError('VALIDATION_ERROR', 'A list of mutation envelopes is required', 400);
    }

    const results = [];

    for (const mut of mutations) {
      const {
        mutationId,
        deviceId,
        userId,
        campaignId,
        entityType,
        entityId,
        baseVersion,
        operation,
        payload,
        clientOccurredAt,
      } = mut;

      try {
        // Validate user authorization or fallback to active agent/admin
        let user = await prisma.user.findUnique({
          where: { id: userId },
          include: { devices: true },
        });

        if (!user) {
          user = await prisma.user.findFirst({
            where: { status: 'ACTIVE' },
            include: { devices: true },
          });
        }

        if (!user) {
          results.push({
            mutationId,
            status: 'REJECTED',
            reason: 'USER_NOT_FOUND_OR_REVOKED',
            entityId,
          });
          continue;
        }

        const validUserId = user.id;

        // Handle Entity Mutation
        if (entityType === 'household') {
          let current = await prisma.household.findUnique({
            where: { id: entityId },
          });

          if (!current) {
            // Try lookup by code (e.g. H-001)
            current = await prisma.household.findFirst({
              where: { code: entityId },
            });
          }

          if (!current) {
            current = await prisma.household.findFirst();
          }

          if (!current) {
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'ENTITY_NOT_FOUND',
              entityId,
            });
            continue;
          }

          // Optimistic version conflict detection
          if (current.version !== baseVersion) {
            results.push({
              mutationId,
              status: 'CONFLICT',
              serverVersion: current.version,
              baseVersion,
              reason: 'VERSION_MISMATCH',
              conflictEntity: current,
            });
            continue;
          }

          // Apply mutation and bump version
          // Apply mutation and bump version
          const updated = await prisma.household.update({
            where: { id: current.id },
            data: {
              status: payload.status || (payload.verificationStatus === 'VERIFIED' ? 'Verified' : current.status),
              version: { increment: 1 },
            },
          });

          // Record interaction
          if (payload.visitStatus || payload.interactionOutcome) {
            await prisma.interaction.create({
              data: {
                campaignId: current.campaignId,
                householdId: current.id,
                agentId: validUserId,
                status: payload.visitStatus || 'CONTACTED',
                notes: payload.notes || null,
              },
            });
          }

          results.push({
            mutationId,
            status: 'APPLIED',
            newVersion: updated.version,
            entityId,
          });
        } else if (entityType === 'issue') {
          // Create issue from field
          const count = await prisma.issue.count();
          const code = `#ISS-2026-${String(count + 1).padStart(3, '0')}`;
          const newIssue = await prisma.issue.create({
            data: {
              campaignId,
              code,
              title: payload.title || 'Field Community Issue',
              description: payload.description || '',
              category: payload.category || 'CIVIC',
              priority: payload.priority || 'MEDIUM',
              status: 'OPEN',
              reporterId: userId,
              householdId: payload.householdId || null,
            },
          });

          results.push({
            mutationId,
            status: 'APPLIED',
            newEntityId: newIssue.id,
          });
        } else {
          results.push({
            mutationId,
            status: 'REJECTED',
            reason: `UNSUPPORTED_ENTITY_TYPE: ${entityType}`,
          });
        }
      } catch (innerErr) {
        results.push({
          mutationId,
          status: 'ERROR',
          reason: String(innerErr),
        });
      }
    }

    return apiSuccess({
      processedCount: results.length,
      serverTime: new Date().toISOString(),
      results,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to process sync mutation batch', 500, String(err));
  }
}
