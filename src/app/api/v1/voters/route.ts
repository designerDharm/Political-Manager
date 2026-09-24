import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const query = searchParams.get('q')?.trim();
    const wardNumber = searchParams.get('ward');
    const boothNumber = searchParams.get('booth');
    const gender = searchParams.get('gender');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (gender && gender !== 'All') where.gender = gender.charAt(0);
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { epicNumber: { contains: query } },
        { houseNumber: { contains: query } },
      ];
    }

    const [total, voters] = await Promise.all([
      prisma.voter.count({ where }),
      prisma.voter.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { serialNumber: 'asc' },
        include: {
          household: { select: { id: true, code: true, address: true, status: true, aiConfidence: true } },
          ward: { select: { id: true, wardNumber: true, name: true } },
          booth: { select: { id: true, boothNumber: true, name: true, pollingStation: true } },
          fieldProvenances: { take: 3 },
        },
      }),
    ]);

    return apiSuccess(voters, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve voters', 500, String(err));
  }
}
