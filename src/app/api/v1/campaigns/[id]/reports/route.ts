import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, getAgentBoothScope } from '@/lib/auth';
import { generateCsv } from '@/lib/analytics/csv';

// GET /api/v1/campaigns/[id]/reports?type=...&format=...&wardId=...&boothId=...
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const campaignId = params.id;
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { principal } = authResult;
    const access = await requireCampaignAccess(principal, campaignId);
    if ('error' in access) return access.error;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'OPERATIONAL_SUMMARY';
    const format = (searchParams.get('format') || 'CSV').toUpperCase();
    const wardId = searchParams.get('wardId') || undefined;
    const boothId = searchParams.get('boothId') || undefined;

    // Validate campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, organizationId: true, electionName: true },
    });

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    // Role-based scoping: Agents can only export their assigned booth(s)
    let agentAllowedBooths: string[] | null = null;
    if (principal.platformRole === 'POLITICAL_AGENT') {
      agentAllowedBooths = await getAgentBoothScope(principal, campaignId);
      if (agentAllowedBooths !== null) {
        if (boothId && !agentAllowedBooths.includes(boothId)) {
          return apiError('FORBIDDEN', 'Cannot export report for unassigned booth', 403);
        }
      }
    }

    // Verify ward if provided
    if (wardId) {
      const ward = await prisma.ward.findFirst({ where: { id: wardId, campaignId } });
      if (!ward) return apiError('NOT_FOUND', 'Ward not found in this campaign', 404);
    }

    // Verify booth if provided
    if (boothId) {
      const booth = await prisma.booth.findFirst({ where: { id: boothId, campaignId } });
      if (!booth) return apiError('NOT_FOUND', 'Booth not found in this campaign', 404);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const safeCampaignSlug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // -------------------------------------------------------------
    // REPORT TYPE 1: OPERATIONAL_SUMMARY
    // -------------------------------------------------------------
    if (reportType === 'OPERATIONAL_SUMMARY') {
      const booths = await prisma.booth.findMany({
        where: {
          campaignId,
          ...(wardId ? { wardId } : {}),
          ...(boothId ? { id: boothId } : {}),
          ...(agentAllowedBooths !== null ? { id: { in: agentAllowedBooths } } : {}),
        },
        include: {
          ward: { select: { wardNumber: true, name: true } },
          _count: { select: { voters: true, households: true, issues: true, visEvents: true } },
        },
        orderBy: { boothNumber: 'asc' },
      });

      const headers = [
        'Ward Number',
        'Ward Name',
        'Booth Number',
        'Booth Name',
        'Registered Electors',
        'Mapped Households',
        'VIS Issued Count',
        'Open Issues Count',
      ];

      const rows = booths.map((b) => [
        b.ward.wardNumber,
        b.ward.name,
        b.boothNumber,
        b.name,
        b.totalElectors || b._count.voters,
        b._count.households,
        b._count.visEvents,
        b._count.issues,
      ]);

      const csvData = generateCsv(headers, rows);

      // Audit export event
      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId,
          actorId: principal.userId,
          action: 'REPORT_EXPORTED',
          resource: 'report:OPERATIONAL_SUMMARY',
          details: JSON.stringify({ format, rowsCount: rows.length, wardId, boothId }),
        },
      });

      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaignops-operational-summary-${safeCampaignSlug}-${todayStr}.csv"`,
        },
      });
    }

    // -------------------------------------------------------------
    // REPORT TYPE 2: FIELD_OPERATIONS
    // -------------------------------------------------------------
    if (reportType === 'FIELD_OPERATIONS') {
      const households = await prisma.household.findMany({
        where: {
          campaignId,
          ...(boothId ? { boothId } : {}),
          ...(wardId ? { booth: { wardId } } : {}),
          ...(agentAllowedBooths !== null ? { boothId: { in: agentAllowedBooths } } : {}),
        },
        include: {
          booth: {
            select: {
              boothNumber: true,
              name: true,
              ward: { select: { wardNumber: true, name: true } },
            },
          },
          members: { select: { id: true } },
          interactions: {
            take: 1,
            orderBy: { occurredAt: 'desc' },
            include: { agent: { select: { displayName: true } } },
          },
        },
        orderBy: { code: 'asc' },
      });

      const headers = [
        'Ward Number',
        'Ward Name',
        'Booth Number',
        'Booth Name',
        'Household Code',
        'House Number',
        'Address',
        'Primary Contact',
        'Voters in Household',
        'Operational Status',
        'Last Visited At',
        'Field Agent',
      ];

      const rows = households.map((h) => [
        h.booth?.ward.wardNumber || '-',
        h.booth?.ward.name || '-',
        h.booth?.boothNumber || '-',
        h.booth?.name || '-',
        h.code,
        h.houseNumber,
        h.address,
        h.primaryContactName || '-',
        h.members.length,
        h.status,
        h.interactions[0]?.occurredAt ? h.interactions[0].occurredAt.toISOString().replace('T', ' ').slice(0, 19) : 'Not Visited',
        h.interactions[0]?.agent?.displayName || 'Unassigned',
      ]);

      const csvData = generateCsv(headers, rows);

      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId,
          actorId: principal.userId,
          action: 'REPORT_EXPORTED',
          resource: 'report:FIELD_OPERATIONS',
          details: JSON.stringify({ format, rowsCount: rows.length, wardId, boothId }),
        },
      });

      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaignops-field-operations-${safeCampaignSlug}-${todayStr}.csv"`,
        },
      });
    }

    // -------------------------------------------------------------
    // REPORT TYPE 3: VIS_DELIVERY_LOG
    // -------------------------------------------------------------
    if (reportType === 'VIS_DELIVERY_LOG') {
      const visEvents = await prisma.visEvent.findMany({
        where: {
          campaignId,
          ...(boothId ? { boothId } : {}),
          ...(agentAllowedBooths !== null ? { boothId: { in: agentAllowedBooths } } : {}),
        },
        include: {
          voter: {
            select: {
              serialNumber: true,
              name: true,
              epicNumber: true,
              ward: { select: { wardNumber: true } },
            },
          },
          booth: { select: { boothNumber: true, name: true } },
          agent: { select: { displayName: true } },
        },
        orderBy: { occurredAt: 'desc' },
      });

      const headers = [
        'Slip Event ID',
        'EPIC Number',
        'Voter Name',
        'Serial Number',
        'Ward Number',
        'Booth Number',
        'Polling Station Name',
        'Event Type',
        'Assistance Details',
        'Issued At',
        'Issued By',
      ];

      const rows = visEvents.map((v) => [
        `VIS-${v.voter.epicNumber}-${v.id.slice(0, 8).toUpperCase()}`,
        v.voter.epicNumber,
        v.voter.name,
        v.voter.serialNumber,
        v.voter.ward?.wardNumber || '-',
        v.booth.boothNumber,
        v.booth.name,
        v.eventType,
        v.assistance || 'Standard In-Person',
        v.occurredAt.toISOString().replace('T', ' ').slice(0, 19),
        v.agent?.displayName || 'Help Desk Operator',
      ]);

      const csvData = generateCsv(headers, rows);

      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId,
          actorId: principal.userId,
          action: 'REPORT_EXPORTED',
          resource: 'report:VIS_DELIVERY_LOG',
          details: JSON.stringify({ format, rowsCount: rows.length, boothId }),
        },
      });

      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaignops-vis-delivery-log-${safeCampaignSlug}-${todayStr}.csv"`,
        },
      });
    }

    // -------------------------------------------------------------
    // REPORT TYPE 4: ISSUES_REGISTER
    // -------------------------------------------------------------
    if (reportType === 'ISSUES_REGISTER') {
      const issues = await prisma.issue.findMany({
        where: {
          campaignId,
          ...(boothId ? { boothId } : {}),
          ...(wardId ? { booth: { wardId } } : {}),
        },
        include: {
          booth: {
            select: {
              boothNumber: true,
              ward: { select: { wardNumber: true } },
            },
          },
          household: { select: { code: true } },
          reporter: { select: { displayName: true } },
          assignee: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'Issue Code',
        'Title',
        'Category',
        'Priority',
        'Status',
        'Ward Number',
        'Booth Number',
        'Household Code',
        'Reported By',
        'Assigned To',
        'Created At',
      ];

      const rows = issues.map((i) => [
        i.code,
        i.title,
        i.category,
        i.priority,
        i.status,
        i.booth?.ward?.wardNumber || '-',
        i.booth?.boothNumber || '-',
        i.household?.code || '-',
        i.reporter?.displayName || 'System',
        i.assignee?.displayName || 'Unassigned',
        i.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      ]);

      const csvData = generateCsv(headers, rows);

      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId,
          actorId: principal.userId,
          action: 'REPORT_EXPORTED',
          resource: 'report:ISSUES_REGISTER',
          details: JSON.stringify({ format, rowsCount: rows.length }),
        },
      });

      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaignops-issues-register-${safeCampaignSlug}-${todayStr}.csv"`,
        },
      });
    }

    // -------------------------------------------------------------
    // REPORT TYPE 5: TURNOUT_PROGRESSION
    // -------------------------------------------------------------
    if (reportType === 'TURNOUT_PROGRESSION') {
      const snapshots = await prisma.turnoutSnapshot.findMany({
        where: {
          campaignId,
          ...(boothId ? { boothId } : {}),
        },
        include: {
          booth: {
            select: {
              boothNumber: true,
              name: true,
              totalElectors: true,
              ward: { select: { wardNumber: true } },
            },
          },
        },
        orderBy: { recordedAt: 'desc' },
      });

      const headers = [
        'Ward Number',
        'Booth Number',
        'Polling Station Name',
        'Total Registered Electors',
        'Turnout Hour',
        'Total Reported Turnout',
        'Turnout Percentage (%)',
        'Source Classification',
        'Recorded At',
      ];

      const rows = snapshots.map((s) => [
        s.booth.ward?.wardNumber || '-',
        s.booth.boothNumber,
        s.booth.name,
        s.booth.totalElectors || '-',
        s.turnoutHour,
        s.totalReported,
        s.percentage,
        s.source,
        s.recordedAt.toISOString().replace('T', ' ').slice(0, 19),
      ]);

      const csvData = generateCsv(headers, rows);

      await prisma.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId,
          actorId: principal.userId,
          action: 'REPORT_EXPORTED',
          resource: 'report:TURNOUT_PROGRESSION',
          details: JSON.stringify({ format, rowsCount: rows.length }),
        },
      });

      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaignops-turnout-progression-${safeCampaignSlug}-${todayStr}.csv"`,
        },
      });
    }

    return apiError(
      'VALIDATION_ERROR',
      `Unsupported report type: '${reportType}'. Supported: OPERATIONAL_SUMMARY, FIELD_OPERATIONS, VIS_DELIVERY_LOG, ISSUES_REGISTER, TURNOUT_PROGRESSION`,
      400
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to generate report', 500, String(err));
  }
}
