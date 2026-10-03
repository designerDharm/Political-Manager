import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, getAgentBoothScope } from '@/lib/auth';

interface MutationEnvelope {
  mutationId: string;
  deviceId: string;
  userId: string;
  campaignId: string;
  entityType: 'household' | 'voter' | 'issue' | 'interaction' | 'vis' | 'VIS_EVENT';
  entityId: string;
  baseVersion: number;
  operation: string;
  payload: Record<string, any>;
  clientOccurredAt: string;
  queuedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
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
        campaignId,
        entityType,
        entityId,
        baseVersion,
        operation,
        payload,
        clientOccurredAt,
      } = mut;

      try {
        // Enforce campaign access
        if (principal.platformRole !== 'SUPER_ADMIN') {
          const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
          if (campaignId && !allowedCampaignIds.includes(campaignId)) {
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'FORBIDDEN_CAMPAIGN_ACCESS',
              entityId,
            });
            continue;
          }
        }

        const validUserId = principal.userId;

        // Idempotency Check: check if mutation was already processed via AuditEvent
        const existingAudit = await prisma.auditEvent.findFirst({
          where: {
            details: {
              contains: `"mutationId":"${mutationId}"`,
            },
          },
        });

        if (existingAudit) {
          results.push({
            mutationId,
            status: 'ALREADY_APPLIED',
            entityId,
            reason: 'IDEMPOTENT_TRANSACTION_ALREADY_COMMITTED',
          });
          continue;
        }

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
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'ENTITY_NOT_FOUND',
              entityId,
            });
            continue;
          }

          // Verify Agent assignment scope on target household
          if (principal.platformRole === 'POLITICAL_AGENT') {
            const allowedBooths = await getAgentBoothScope(principal, current.campaignId);
            if (allowedBooths !== null && current.boothId && !allowedBooths.includes(current.boothId)) {
              results.push({
                mutationId,
                status: 'FORBIDDEN',
                reason: 'FORBIDDEN_OUTSIDE_ASSIGNED_BOOTH_SCOPE',
                entityId,
              });
              continue;
            }
          }

          // Optimistic version conflict detection
          if (typeof baseVersion === 'number' && current.version !== baseVersion) {
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

          // Atomic execution of update, interaction, and audit event
          const updated = await prisma.$transaction(async (tx) => {
            const up = await tx.household.update({
              where: { id: current.id },
              data: {
                status: payload.status || (payload.verificationStatus === 'VERIFIED' ? 'Verified' : current.status),
                version: { increment: 1 },
              },
            });

            if (payload.visitStatus || payload.notes) {
              await tx.interaction.create({
                data: {
                  campaignId: current.campaignId,
                  householdId: current.id,
                  agentId: validUserId,
                  status: payload.visitStatus || 'VISITED',
                  notes: payload.notes || null,
                },
              });
            }

            // Emit AuditEvent for Step 7 Realtime SSE Propagation
            // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
            await tx.auditEvent.create({
              data: {
                actorId: validUserId,
                organizationId: principal.organizationId,
                campaignId: current.campaignId,
                action: 'FIELD_VISIT_RECORDED',
                resource: `household:${current.id}`,
                details: JSON.stringify({
                  mutationId,
                  deviceId,
                  householdId: current.id,
                  code: current.code,
                  boothId: current.boothId,
                  agentId: validUserId,
                  visitStatus: payload.visitStatus || 'VISITED',
                  clientOccurredAt,
                }),
              },
            });

            return up;
          });

          results.push({
            mutationId,
            status: 'APPLIED',
            newVersion: updated.version,
            entityId: current.id,
          });
        } else if (entityType === 'issue') {
          // Verify agent scope if boothId provided
          if (principal.platformRole === 'POLITICAL_AGENT' && payload.boothId) {
            const allowedBooths = await getAgentBoothScope(principal, campaignId);
            if (allowedBooths !== null && !allowedBooths.includes(payload.boothId)) {
              results.push({
                mutationId,
                status: 'FORBIDDEN',
                reason: 'FORBIDDEN_OUTSIDE_ASSIGNED_BOOTH_SCOPE',
                entityId,
              });
              continue;
            }
          }

          const count = await prisma.issue.count();
          const code = `#ISS-2026-${String(count + 1).padStart(3, '0')}`;
          
          const newIssue = await prisma.$transaction(async (tx) => {
            const createdIssue = await tx.issue.create({
              data: {
                campaignId,
                code,
                title: payload.title || 'Field Community Issue',
                description: payload.description || '',
                category: payload.category || 'CIVIC',
                priority: payload.priority || 'MEDIUM',
                status: 'OPEN',
                reporterId: validUserId,
                householdId: payload.householdId || null,
              },
            });

            // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
            await tx.auditEvent.create({
              data: {
                actorId: validUserId,
                organizationId: principal.organizationId,
                campaignId,
                action: 'ISSUE_CREATED',
                resource: `issue:${createdIssue.id}`,
                details: JSON.stringify({
                  mutationId,
                  deviceId,
                  issueId: createdIssue.id,
                  boothId: payload.boothId || null,
                  priority: createdIssue.priority,
                  clientOccurredAt,
                }),
              },
            });

            return createdIssue;
          });

          results.push({
            mutationId,
            status: 'APPLIED',
            newEntityId: newIssue.id,
          });
        } else if (entityType === 'vis' || entityType === 'VIS_EVENT') {
          // Offline VIS issuance mutation
          const { voterId, boothId, eventType, assistance } = payload;
          if (!voterId || !boothId) {
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'VALIDATION_ERROR: voterId and boothId required',
              entityId,
            });
            continue;
          }

          // Verify voter exists in this campaign
          const voter = await prisma.voter.findUnique({
            where: { id: voterId },
          });

          if (!voter || voter.campaignId !== campaignId) {
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'VOTER_NOT_FOUND_IN_CAMPAIGN',
              entityId,
            });
            continue;
          }

          // Verify booth mismatch (voter must belong to booth)
          if (voter.boothId !== boothId) {
            results.push({
              mutationId,
              status: 'REJECTED',
              reason: 'BOOTH_MISMATCH: Voter does not belong to specified booth',
              entityId,
            });
            continue;
          }

          // Enforce agent booth scope
          if (principal.platformRole === 'POLITICAL_AGENT') {
            const allowedBooths = await getAgentBoothScope(principal, campaignId);
            if (allowedBooths !== null && !allowedBooths.includes(boothId)) {
              results.push({
                mutationId,
                status: 'FORBIDDEN',
                reason: 'FORBIDDEN_OUTSIDE_ASSIGNED_BOOTH_SCOPE',
                entityId,
              });
              continue;
            }
          }

          // Idempotency: check if identical mutation already recorded or voter already issued
          const existingVis = await prisma.visEvent.findFirst({
            where: { voterId, campaignId },
            orderBy: { occurredAt: 'desc' },
          });

          const isReissue = eventType === 'REISSUED' || (existingVis && existingVis.eventType === 'ISSUED');
          const finalEventType = isReissue ? 'REISSUED' : 'ISSUED';

          const createdVis = await prisma.$transaction(async (tx) => {
            const vis = await tx.visEvent.create({
              data: {
                campaignId,
                voterId,
                boothId,
                agentId: validUserId,
                eventType: finalEventType,
                assistance: assistance || null,
              },
            });

            // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
            await tx.auditEvent.create({
              data: {
                actorId: validUserId,
                organizationId: principal.organizationId,
                campaignId,
                action: finalEventType === 'REISSUED' ? 'VIS_REISSUED' : 'VIS_ISSUED',
                resource: `vis:${vis.id}`,
                details: JSON.stringify({
                  mutationId,
                  deviceId,
                  voterId,
                  boothId,
                  clientOccurredAt,
                }),
              },
            });

            return vis;
          });

          results.push({
            mutationId,
            status: 'APPLIED',
            newEntityId: createdVis.id,
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
