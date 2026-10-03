import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { logAuditEvent } from '@/lib/api/audit';

// GET: Retrieve all political parties (Single Source of Truth)
export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const organizationId = org?.id;

    const parties = await prisma.party.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return apiSuccess(parties);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve political parties', 500, String(err));
  }
}

import { requirePlatformRole } from '@/lib/auth';

// POST: Super Admin creates a political party with symbol, abbreviation & brand identity
export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePlatformRole(req, ['SUPER_ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await req.json();
    const { name, abbreviation, symbolUrl, brandColor, isIndependent } = body;

    if (!name || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Party name is required', 400);
    }

    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!org) {
      return apiError('NOT_FOUND', 'No active organization found to attach party', 404);
    }

    const party = await prisma.party.create({
      data: {
        organizationId: org.id,
        name: name.trim(),
        abbreviation: abbreviation ? abbreviation.trim().toUpperCase() : null,
        symbolUrl: symbolUrl || null,
      },
    });

    // Audit event for party creation
    await logAuditEvent({
      organizationId: org.id,
      action: 'CREATE_POLITICAL_PARTY',
      resource: `party:${party.id}`,
      details: JSON.stringify({
        name: party.name,
        abbreviation: party.abbreviation,
        symbolUrl: party.symbolUrl,
        brandColor,
        isIndependent: !!isIndependent,
      }),
    });

    return apiSuccess(party, { message: 'Political party created successfully' }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create political party', 500, String(err));
  }
}
