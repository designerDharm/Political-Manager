import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// POST /api/v1/imports/publish - Transactional idempotent publishing of staged records to Voter registry
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents are not permitted to publish electoral rolls', 403);
    }

    const body = await req.json();
    const { campaignId, importId, wardId: overrideWardId, boothId: overrideBoothId } = body;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    if (!importId) {
      return apiError('VALIDATION_ERROR', 'Import ID is required to publish staged records', 400);
    }

    const access = await requireCampaignAccess(authResult.principal, campaignId);
    if ('error' in access) return access.error;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        wards: {
          include: { booths: true },
        },
      },
    });

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }

    const importJob = await prisma.electoralRollImport.findUnique({
      where: { id: importId },
      include: {
        records: true,
      },
    });

    if (!importJob) {
      return apiError('NOT_FOUND', 'Import job not found', 404);
    }

    if (importJob.campaignId !== campaignId) {
      return apiError('FORBIDDEN', 'Import job does not belong to specified campaign', 403);
    }

    // Idempotency check: if already completed, return existing status
    if (importJob.status === 'Completed' || importJob.status === 'PUBLISHED') {
      return apiSuccess({
        importId: importJob.id,
        status: 'ALREADY_PUBLISHED',
        publishedCount: importJob.totalExtracted,
        message: 'Import has already been published to the authoritative database',
      });
    }

    // Determine target Ward and Booth
    let targetWardId = overrideWardId || importJob.wardId;
    let targetBoothId = overrideBoothId || importJob.boothId;

    if (!targetWardId) {
      // Pick first ward or create a default ward
      if (campaign.wards.length > 0) {
        targetWardId = campaign.wards[0].id;
      } else {
        const createdWard = await prisma.ward.create({
          data: {
            campaignId: campaign.id,
            wardNumber: 1,
            name: 'Ward 1 - Central',
          },
        });
        targetWardId = createdWard.id;
      }
    }

    if (!targetBoothId) {
      const existingBooths = await prisma.booth.findMany({
        where: { wardId: targetWardId },
      });
      if (existingBooths.length > 0) {
        targetBoothId = existingBooths[0].id;
      } else {
        const createdBooth = await prisma.booth.create({
          data: {
            campaignId: campaign.id,
            wardId: targetWardId,
            boothNumber: 1,
            name: 'Polling Station 1',
            areaLocality: 'Central Sector',
            pollingStation: 'Primary School Building',
          },
        });
        targetBoothId = createdBooth.id;
      }
    }

    // Prevent publishing if any records in the batch are still INVALID or have unresolved validation errors
    const invalidRecords = importJob.records.filter((r) => r.status === 'INVALID' && !r.reviewed && !r.corrected);
    if (invalidRecords.length > 0) {
      return apiError(
        'VALIDATION_ERROR',
        `Cannot publish import: ${invalidRecords.length} record(s) contain invalid or missing required values (e.g. invalid gender/name/EPIC). Please review and correct all invalid records in Review Center before publishing.`,
        400
      );
    }

    // Read valid/publishable staged records
    // Exclude unreviewed duplicate suspects if any
    const publishableRecords = importJob.records.filter(
      (r) => r.status === 'VALID' || r.reviewed || r.corrected
    );

    if (publishableRecords.length === 0) {
      return apiError(
        'VALIDATION_ERROR',
        'No valid records available to publish. Please review and approve records first.',
        400
      );
    }

    // Transactional publish
    const result = await prisma.$transaction(async (tx) => {
      let publishedCount = 0;
      let updatedCount = 0;

      for (const rec of publishableRecords) {
        const recWardId = rec.wardId || targetWardId;
        const recBoothId = rec.boothId || targetBoothId;

        // Ensure gender is valid enum M, F, or O
        const genderVal = rec.gender === 'F' ? 'F' : rec.gender === 'O' ? 'O' : 'M';

        const voter = await tx.voter.upsert({
          where: { epicNumber: rec.epicNumber },
          update: {
            campaignId: campaign.id,
            wardId: recWardId,
            boothId: recBoothId,
            serialNumber: rec.serialNumber,
            name: rec.fullName,
            guardianName: rec.relationName || null,
            relationshipType: rec.relationType || 'OTHER',
            houseNumber: rec.houseNumber || '0',
            age: rec.age,
            gender: genderVal,
            status: 'Processed',
            verificationStatus: 'VERIFIED',
          },
          create: {
            campaignId: campaign.id,
            wardId: recWardId,
            boothId: recBoothId,
            serialNumber: rec.serialNumber,
            name: rec.fullName,
            guardianName: rec.relationName || null,
            relationshipType: rec.relationType || 'OTHER',
            houseNumber: rec.houseNumber || '0',
            age: rec.age,
            gender: genderVal,
            epicNumber: rec.epicNumber,
            status: 'Processed',
            verificationStatus: 'VERIFIED',
          },
        });

        // Record provenance
        await tx.voterFieldProvenance.create({
          data: {
            voterId: voter.id,
            fieldName: 'electoral_roll_import',
            currentValue: JSON.stringify({
              epic: rec.epicNumber,
              name: rec.fullName,
              house: rec.houseNumber,
              age: rec.age,
              gender: rec.gender,
            }),
            sourceType: 'ELECTORAL_ROLL_OCR',
            sourceRecordId: rec.id,
            sourcePage: rec.sourcePage,
          },
        });

        publishedCount++;
      }

      // Mark staged records as PUBLISHED
      await tx.importRecord.updateMany({
        where: { id: { in: publishableRecords.map((r) => r.id) } },
        data: { status: 'PUBLISHED' },
      });

      // Update import job
      await tx.electoralRollImport.update({
        where: { id: importId },
        data: {
          status: 'Completed',
          completedAt: new Date(),
          totalExtracted: publishedCount,
        },
      });

      // Update Booth totalElectors count
      const totalElectorsInBooth = await tx.voter.count({
        where: { boothId: targetBoothId },
      });
      await tx.booth.update({
        where: { id: targetBoothId },
        data: { totalElectors: totalElectorsInBooth },
      });

      // Audit Log
      // TODO(QA-021): tx-scoped audit — migrate to logAuditEvent when transaction boundary is refactored
      await tx.auditEvent.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          actorId: authResult.principal.userId,
          action: 'IMPORT_PUBLISHED',
          resource: `ElectoralRollImport:${importId}`,
          details: JSON.stringify({
            campaignId: campaign.id,
            publishedCount,
            targetWardId,
            targetBoothId,
          }),
        },
      });

      return {
        publishedCount,
        targetWardId,
        targetBoothId,
      };
    });

    return apiSuccess({
      status: 'PUBLISHED',
      importId,
      publishedCount: result.publishedCount,
      targetWardId: result.targetWardId,
      targetBoothId: result.targetBoothId,
    }, { message: 'Import records successfully published to PostgreSQL Voter registry' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to publish electoral roll import', 500, String(err));
  }
}
