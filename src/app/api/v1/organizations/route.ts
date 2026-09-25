import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { campaigns: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(orgs);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve organizations', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug } = body;

    if (!name || !name.trim()) {
      return apiError('VALIDATION_ERROR', 'Organization name is required', 400);
    }

    const orgSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (existing) {
      return apiError('CONFLICT', `Organization with slug '${orgSlug}' already exists`, 409);
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: orgSlug,
      },
    });

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        organizationId: org.id,
        action: 'CREATE_ORGANIZATION',
        resource: `organization:${org.id}`,
        details: JSON.stringify({ name: org.name, slug: org.slug }),
      },
    });

    return apiSuccess(org, { message: 'Organization created successfully' }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to create organization', 500, String(err));
  }
}
