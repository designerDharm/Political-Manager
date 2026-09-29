import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';
import { getCampaignOperationalMetrics } from '@/lib/analytics/metrics';

// GET /api/v1/analytics?campaignId=...&wardId=...&boothId=...&agentId=...
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId') || principal.campaignMemberships[0]?.campaignId;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    const access = await requireCampaignAccess(principal, campaignId);
    if ('error' in access) return access.error;

    // Filter validation
    const wardId = searchParams.get('wardId') || undefined;
    const boothId = searchParams.get('boothId') || undefined;
    const agentId = searchParams.get('agentId') || undefined;
    const timeRange = searchParams.get('timeRange') || 'ALL';

    // Verify ward belongs to campaign if supplied (Anti-IDOR)
    if (wardId) {
      const ward = await prisma.ward.findFirst({ where: { id: wardId, campaignId } });
      if (!ward) {
        return apiError('NOT_FOUND', 'Specified Ward not found in this campaign', 404);
      }
    }

    // Verify booth belongs to campaign if supplied (Anti-IDOR)
    if (boothId) {
      const booth = await prisma.booth.findFirst({ where: { id: boothId, campaignId } });
      if (!booth) {
        return apiError('NOT_FOUND', 'Specified Booth not found in this campaign', 404);
      }
    }

    // Verify agent belongs to campaign if supplied
    if (agentId) {
      const membership = await prisma.campaignMembership.findFirst({
        where: { userId: agentId, campaignId },
      });
      if (!membership) {
        return apiError('NOT_FOUND', 'Specified Agent does not belong to this campaign', 404);
      }
    }

    // Scope check if called by Political Agent
    if (principal.platformRole === 'POLITICAL_AGENT') {
      const allowedBooths = await getAgentBoothScope(principal, campaignId);
      if (allowedBooths !== null) {
        if (boothId && !allowedBooths.includes(boothId)) {
          return apiError('FORBIDDEN', 'Access to this booth is outside your assigned scope', 403);
        }
      }
    }

    // Parse date filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (timeRange === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'LAST_7_DAYS') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'LAST_30_DAYS') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const metrics = await getCampaignOperationalMetrics(campaignId, {
      wardId,
      boothId,
      agentId,
      startDate,
      endDate,
    });

    return apiSuccess(metrics);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve campaign analytics', 500, String(err));
  }
}
