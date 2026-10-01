import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess } from '@/lib/auth';

// PATCH /api/v1/imports/[id]/records/[recordId] - Correct/Review staged voter record
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot edit import staging records', 403);
    }

    const { id: importId, recordId } = params;

    const record = await prisma.importRecord.findUnique({
      where: { id: recordId },
      include: { importJob: true },
    });

    if (!record || record.importId !== importId) {
      return apiError('NOT_FOUND', 'Staged import record not found', 404);
    }

    const access = await requireCampaignAccess(authResult.principal, record.campaignId);
    if ('error' in access) return access.error;

    const body = await req.json();
    const {
      fullName,
      relationName,
      relationType,
      houseNumber,
      age,
      gender,
      epicNumber,
      status, // Can be manually resolved to 'VALID'
    } = body;

    const updateData: any = {
      reviewed: true,
      corrected: true,
    };

    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (relationName !== undefined) updateData.relationName = String(relationName).trim();
    if (relationType !== undefined) updateData.relationType = String(relationType);
    if (houseNumber !== undefined) updateData.houseNumber = String(houseNumber).trim();
    if (age !== undefined) updateData.age = Number(age);
    if (epicNumber !== undefined) updateData.epicNumber = String(epicNumber).trim().toUpperCase();
    if (status !== undefined) updateData.status = String(status);

    if (gender !== undefined) {
      const gStr = String(gender).trim();
      const upper = gStr.toUpperCase();
      let normalizedGender: 'M' | 'F' | 'O' | null = null;
      if (upper === 'M' || upper === 'MALE' || upper === 'पुरुष') normalizedGender = 'M';
      else if (upper === 'F' || upper === 'FEMALE' || upper === 'महिला' || upper === 'स्त्री') normalizedGender = 'F';
      else if (upper === 'O' || upper === 'OTHER' || upper === 'OTHERS' || upper === 'TRANSGENDER') normalizedGender = 'O';

      if (!normalizedGender) {
        return apiError('VALIDATION_ERROR', `Invalid gender value "${gender}". Must be MALE (M), FEMALE (F), or OTHER (O).`, 400);
      }
      updateData.gender = normalizedGender;
    }

    // If marked valid or fields were corrected, bump confidence
    if (status === 'VALID' || updateData.fullName || updateData.epicNumber || updateData.gender) {
      updateData.confidence = 0.99;
      updateData.validationErrors = null;
    }

    const updated = await prisma.importRecord.update({
      where: { id: recordId },
      data: updateData,
    });

    // Recompute import job stats
    const [lowCount, dupCount] = await Promise.all([
      prisma.importRecord.count({
        where: { importId, status: { in: ['LOW_CONFIDENCE', 'INVALID'] } },
      }),
      prisma.importRecord.count({
        where: { importId, status: 'DUPLICATE_SUSPECT' },
      }),
    ]);

    await prisma.electoralRollImport.update({
      where: { id: importId },
      data: {
        lowConfidenceCount: lowCount,
        duplicateCount: dupCount,
        status: lowCount === 0 && dupCount === 0 ? 'ReadyToPublish' : 'LowConfidenceReview',
      },
    });

    return apiSuccess(updated, { message: 'Record updated successfully' });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to update import record', 500, String(err));
  }
}
