import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

import { requirePlatformRole } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { id } = params;
    const existing = await prisma.party.findUnique({
      where: { id },
      include: { candidates: true },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Party not found', 404);
    }

    if (existing.candidates.length > 0) {
      return apiError('CONFLICT', 'Cannot delete party associated with existing candidates', 409);
    }

    await prisma.party.delete({
      where: { id },
    });

    return apiSuccess({ id }, { message: 'Party deleted successfully' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to delete party', 500, String(err));
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { id } = params;
    const body = await req.json();
    const { name, abbreviation, symbolUrl } = body;

    const updated = await prisma.party.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        abbreviation: abbreviation !== undefined ? abbreviation?.trim()?.toUpperCase() : undefined,
        symbolUrl: symbolUrl !== undefined ? symbolUrl : undefined,
      },
    });

    return apiSuccess(updated, { message: 'Party updated successfully' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to update party', 500, String(err));
  }
}
