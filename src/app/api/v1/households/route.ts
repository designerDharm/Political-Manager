import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const boothId = searchParams.get('boothId');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (boothId) where.boothId = boothId;

    const households = await prisma.household.findMany({
      where,
      take: limit,
      include: {
        members: {
          select: {
            id: true,
            name: true,
            age: true,
            gender: true,
            epicNumber: true,
            roleInHousehold: true,
          },
        },
        booth: { select: { id: true, boothNumber: true, name: true } },
        interactions: { take: 3, orderBy: { occurredAt: 'desc' } },
      },
      orderBy: { code: 'asc' },
    });

    return apiSuccess(households);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve households', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, boothId, code, address, houseNumber, primaryContactName } = body;

    if (!code || !address) {
      return apiError('VALIDATION_ERROR', 'Household code and address are required', 400);
    }

    const household = await prisma.household.create({
      data: {
        campaignId,
        boothId,
        code,
        address,
        houseNumber: houseNumber || '',
        primaryContactName,
        status: 'Pending',
        version: 1,
      },
    });

    return apiSuccess(household, { created: true }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create household', 500, String(err));
  }
}
