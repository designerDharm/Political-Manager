import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const { hid } = params;
    if (!hid) {
      return apiError('VALIDATION_ERROR', 'Household ID or code is required', 400);
    }

    // Try finding by UUID first, then by code (e.g. H-001)
    let household = await prisma.household.findFirst({
      where: {
        OR: [
          { id: hid },
          { code: hid },
        ],
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            age: true,
            gender: true,
            epicNumber: true,
            roleInHousehold: true,
            relationshipType: true,
            guardianName: true,
          },
        },
        booth: {
          select: {
            id: true,
            boothNumber: true,
            name: true,
            ward: {
              select: {
                wardNumber: true,
                name: true,
              },
            },
          },
        },
        interactions: {
          orderBy: { occurredAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!household) {
      return apiError('NOT_FOUND', `Household '${hid}' not found in database`, 404);
    }

    return apiSuccess(household);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve household', 500, String(err));
  }
}
