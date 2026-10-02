import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

// Guardrail keywords that must NEVER be processed by the analytics engine (Strict Non-Inference Policy)
const PROHIBITED_KEYWORDS = [
  'vote for',
  'vote-prediction',
  'prediction',
  'predict',
  'political preference',
  'political-support',
  'support probability',
  'likely to vote',
  'leaning',
  'persuadable',
  'persuasion',
  'persuade',
  'ideology',
  'ideological',
  'religion',
  'religious',
  'caste',
  'conversion score',
  'who will vote',
  'party affinity',
  'undecided voter',
  'voter preference',
];

import { requireAuth } from '@/lib/auth';

interface GovernedQuerySpec {
  intent: string;
  scope: string;
  aggregation: string;
  parameters: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const body = await req.json();
    const { prompt, campaignId } = body;

    if (principal.platformRole !== 'SUPER_ADMIN') {
      const allowedCampaignIds = principal.campaignMemberships.map((m) => m.campaignId);
      if (campaignId && !allowedCampaignIds.includes(campaignId)) {
        return apiError('FORBIDDEN', 'Access to analytics for this campaign is denied', 403);
      }
    }

    if (!prompt) {
      return apiError('VALIDATION_ERROR', 'Prompt is required', 400);
    }

    const lowerPrompt = prompt.toLowerCase();

    // 1. Guardrail Policy Check (Docs 13: Strict Non-Inference Guardrail)
    for (const disallowed of PROHIBITED_KEYWORDS) {
      if (lowerPrompt.includes(disallowed)) {
        return apiError(
          'GUARDRAIL_VIOLATION',
          `Inquiry contains prohibited criteria '${disallowed}'. CampaignOps AI strictly forbids voter persuasion scoring, ideological inference, or religious/caste profiling under national data protection and election integrity rules.`,
          403,
          { violation: disallowed, allowedDomain: 'Strictly operational and logistics metrics only' }
        );
      }
    }

    // 2. Semantic Intent Classification & Query Dispatch
    let intentResult: any = null;
    let explanation = '';

    if (lowerPrompt.includes('turnout') || lowerPrompt.includes('polling')) {
      const snapshots = await prisma.turnoutSnapshot.findMany({
        where: campaignId ? { campaignId } : undefined,
        orderBy: { recordedAt: 'desc' },
        take: 10,
        include: { booth: true },
      });
      intentResult = {
        metric: 'AGGREGATE_TURNOUT',
        snapshots: snapshots.map((s) => ({
          booth: s.booth?.name || 'General',
          percentage: s.percentage,
          hour: s.turnoutHour,
          recordedAt: s.recordedAt,
        })),
      };
      explanation = 'Retrieved aggregate polling turnout progression reported by authorized agents across booths.';
    } else if (lowerPrompt.includes('household') || lowerPrompt.includes('visit') || lowerPrompt.includes('coverage')) {
      const [totalHouseholds, distinctVisitedInteractions, verifiedHouseholds] = await Promise.all([
        prisma.household.count(campaignId ? { where: { campaignId } } : undefined),
        prisma.interaction.findMany({
          where: {
            ...(campaignId ? { campaignId } : {}),
            householdId: { not: null },
          },
          distinct: ['householdId'],
          select: { householdId: true },
        }),
        prisma.household.count({
          where: {
            ...(campaignId ? { campaignId } : {}),
            status: 'Verified',
          },
        }),
      ]);

      const visitedHouseholds = Math.min(distinctVisitedInteractions.length, totalHouseholds);
      const coverageRate = totalHouseholds > 0 ? ((visitedHouseholds / totalHouseholds) * 100).toFixed(0) : '0';

      intentResult = {
        metric: 'HOUSEHOLD_COVERAGE',
        totalHouseholds,
        visitedHouseholds,
        verifiedHouseholds,
        coverageRate: `${coverageRate}%`,
      };
      explanation = `Currently, ${visitedHouseholds} out of ${totalHouseholds} households (${coverageRate}%) have received field visits.`;
    } else if (lowerPrompt.includes('issue') || lowerPrompt.includes('water') || lowerPrompt.includes('road')) {
      const issueBreakdown = await prisma.issue.groupBy({
        by: ['category', 'status'],
        where: campaignId ? { campaignId } : undefined,
        _count: true,
      });

      intentResult = {
        metric: 'ISSUE_SUMMARY',
        breakdown: issueBreakdown.map((i) => ({
          category: i.category,
          status: i.status,
          count: i._count,
        })),
      };
      explanation = 'Aggregated community grievances categorized by operational status and infrastructure domain.';
    } else if (lowerPrompt.includes('vis') || lowerPrompt.includes('slip') || lowerPrompt.includes('help desk')) {
      const totalVis = await prisma.visEvent.count({
        where: {
          ...(campaignId ? { campaignId } : {}),
          eventType: 'ISSUED',
        },
      });

      intentResult = {
        metric: 'VIS_ISSUANCE',
        totalVisIssued: totalVis,
        note: 'Voter Information Slips issued via civic help-desks. This is strictly non-partisan locator assistance.',
      };
      explanation = `Total of ${totalVis} Voter Information Slips (VIS) have been printed and delivered to citizens.`;
    } else {
      // General Campaign Metrics
      const [voterCount, householdCount, issueCount, taskCount] = await Promise.all([
        prisma.voter.count(campaignId ? { where: { campaignId } } : undefined),
        prisma.household.count(campaignId ? { where: { campaignId } } : undefined),
        prisma.issue.count(campaignId ? { where: { campaignId } } : undefined),
        prisma.assignment.count(campaignId ? { where: { campaignId } } : undefined),
      ]);

      intentResult = {
        metric: 'OPERATIONAL_OVERVIEW',
        voters: voterCount,
        households: householdCount,
        issues: issueCount,
        assignments: taskCount,
      };
      explanation = 'Retrieved general operational indicators for the selected campaign scope.';
    }

    return apiSuccess({
      query: prompt,
      guardrailEvaluation: 'PASSED_NON_INFERENCE_POLICY',
      explanation,
      data: intentResult,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to execute governed analytics query', 500, String(err));
  }
}
