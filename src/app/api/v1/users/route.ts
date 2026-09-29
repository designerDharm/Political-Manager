import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAuth, requireCampaignAccess, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    if (campaignId) {
      const access = await requireCampaignAccess(authResult.principal, campaignId);
      if ('error' in access) return access.error;

      // Return users belonging to this campaign
      const memberships = await prisma.campaignMembership.findMany({
        where: { campaignId, active: true },
        include: {
          user: {
            include: {
              assignments: { where: { campaignId } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const users = memberships.map((m) => ({
        ...m.user,
        campaignRole: m.role,
        scopeType: m.scopeType,
        scopeIds: m.scopeIds,
      }));

      return apiSuccess(users);
    }

    // If super admin or no campaignId requested
    if (authResult.principal.platformRole !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'campaignId is required to list users', 403);
    }

    const users = await prisma.user.findMany({
      include: {
        organization: true,
        devices: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(users);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve users', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const body = await req.json();
    const { email, password, displayName, role, phone, campaignId, scopeType, scopeIds } = body;

    if (!email || !displayName) {
      return apiError('VALIDATION_ERROR', 'Email and display name are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify campaign access if campaignId provided
    if (campaignId) {
      const access = await requireCampaignAccess(authResult.principal, campaignId);
      if ('error' in access) return access.error;
    } else if (authResult.principal.platformRole === 'POLITICAL_AGENT') {
      return apiError('FORBIDDEN', 'Political agents cannot create users', 403);
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const targetOrgId = authResult.principal.organizationId || (await prisma.organization.findFirst())?.id;
    if (!targetOrgId) {
      return apiError('VALIDATION_ERROR', 'No organization found', 400);
    }

    // Prevent privilege escalation: only existing SUPER_ADMIN can grant SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && authResult.principal.platformRole !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Privilege escalation rejected: only Super Admins can provision Super Admin accounts', 403);
    }
    const effectiveRole = role || 'POLITICAL_AGENT';

    if (!user) {
      const initialPassword = password || 'Password@123';
      const passwordHash = await hashPassword(initialPassword);

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          displayName: displayName.trim(),
          role: effectiveRole,
          phone: phone ? phone.trim() : null,
          organizationId: targetOrgId,
          status: 'ACTIVE',
        },
      });
    }

    // If campaignId was specified, add user as CampaignMembership if not already a member
    if (campaignId) {
      const existingMembership = await prisma.campaignMembership.findFirst({
        where: { campaignId, userId: user.id },
      });

      if (!existingMembership) {
        await prisma.campaignMembership.create({
          data: {
            campaignId,
            userId: user.id,
            role: effectiveRole,
            scopeType: scopeType || 'ALL',
            scopeIds: scopeIds ? JSON.stringify(scopeIds) : '[]',
            active: true,
          },
        });
      } else if (!existingMembership.active) {
        await prisma.campaignMembership.update({
          where: { id: existingMembership.id },
          data: { active: true, role: effectiveRole },
        });
      }

      await prisma.auditEvent.create({
        data: {
          organizationId: targetOrgId,
          campaignId,
          actorId: authResult.principal.userId,
          action: 'AGENT_ADDED_TO_CAMPAIGN',
          resource: `User:${user.id}`,
          details: JSON.stringify({ email: user.email, role: effectiveRole, displayName: user.displayName }),
        },
      });
    }

    return apiSuccess(user, { message: 'Team member processed successfully' }, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to provision user', 500, String(err));
  }
}

