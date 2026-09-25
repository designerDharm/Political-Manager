import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: {
        organization: true,
        devices: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(users);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve users', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, displayName, role, phone, organizationId } = body;

    if (!email || !password || !displayName) {
      return apiError('VALIDATION_ERROR', 'Email, password, and display name are required', 400);
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return apiError('CONFLICT', `User with email '${email}' already exists`, 409);
    }

    // Default to first organization if not specified
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) {
        return apiError('VALIDATION_ERROR', 'No organization exists. Please create an organization first.', 400);
      }
      targetOrgId = firstOrg.id;
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        role: role || 'CAMPAIGN_ADMIN',
        phone: phone ? phone.trim() : null,
        organizationId: targetOrgId,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: targetOrgId,
        action: 'PROVISION_USER',
        resource: `user:${user.id}`,
        details: JSON.stringify({ email: user.email, role: user.role, displayName: user.displayName }),
      },
    });

    return apiSuccess(user, { message: 'User provisioned successfully' }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 'Failed to provision user', 500, String(err));
  }
}
