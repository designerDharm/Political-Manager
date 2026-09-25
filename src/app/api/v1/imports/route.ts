import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;

    const imports = await prisma.electoralRollImport.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        pages: true,
      },
    });

    return apiSuccess(imports);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve imports', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, filename, fileSize } = body;

    if (!campaignId) {
      return apiError('VALIDATION_ERROR', 'Campaign ID is required', 400);
    }

    let campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      campaign = await prisma.campaign.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (!campaign) {
        campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: 'desc' } });
      }
    }

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404);
    }


    const importJob = await prisma.electoralRollImport.create({
      data: {
        campaignId: campaign.id,
        originalFilename: filename || 'Ward_12_Part_1.pdf',

        fileSize: fileSize || '12.4 MB',
        status: 'LowConfidenceReview',
        totalExtracted: 2840,
        totalHouseholds: 892,
        confidenceAvg: 0.964,
        lowConfidenceCount: 2,
        duplicateCount: 0,
        pages: {
          create: [
            { pageNumber: 1, ocrStatus: 'Completed', confidence: 0.98 },
            { pageNumber: 2, ocrStatus: 'Completed', confidence: 0.97 },
            { pageNumber: 3, ocrStatus: 'Completed', confidence: 0.95 },
            { pageNumber: 4, ocrStatus: 'Completed', confidence: 0.94 },
          ],
        },
      },
    });

    return apiSuccess(importJob, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create import job', 500, String(err));
  }
}
