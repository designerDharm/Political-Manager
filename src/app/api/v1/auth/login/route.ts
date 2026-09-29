import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { verifyPassword, createSession, SESSION_COOKIE_NAME, SESSION_TTL_HOURS } from '@/lib/auth';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('VALIDATION_ERROR', 'Email and password are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generic error to prevent user enumeration
    const invalidCredentialsError = () =>
      apiError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true,
        memberships: {
          where: { active: true },
          include: { campaign: true },
        },
      },
    });

    if (!user) {
      return invalidCredentialsError();
    }

    // Check account status
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return apiError('ACCOUNT_DISABLED', 'Account is disabled. Please contact your administrator.', 403);
    }

    if (user.status === 'INVITED') {
      return apiError('ACCOUNT_NOT_ACTIVATED', 'Account invitation is pending activation.', 403);
    }

    // Check lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return apiError(
        'ACCOUNT_LOCKED',
        `Account is temporarily locked due to too many failed attempts. Try again in ${minutesRemaining} minute(s).`,
        423
      );
    }

    if (!user.passwordHash) {
      return invalidCredentialsError();
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      const newFailedCount = user.failedLoginCount + 1;
      const willLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = willLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: willLock ? 0 : newFailedCount,
          lockedUntil,
        },
      });

      await prisma.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          action: 'LOGIN_FAILURE',
          resource: `user:${user.id}`,
          details: JSON.stringify({ email: normalizedEmail, reason: 'INVALID_PASSWORD', attempt: newFailedCount }),
        },
      });

      if (willLock) {
        return apiError(
          'ACCOUNT_LOCKED',
          `Too many failed attempts. Account temporarily locked for ${LOCKOUT_MINUTES} minutes.`,
          423
        );
      }

      return invalidCredentialsError();
    }

    // Successful login: reset failed counter and update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Create session in PostgreSQL
    const { token, expiresAt } = await createSession(user.id, req);

    // Write audit event
    await prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        action: 'LOGIN_SUCCESS',
        resource: `user:${user.id}`,
        details: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    // Prepare response with HTTP-only cookie
    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      SESSION_TTL_HOURS * 3600
    }${isProd ? '; Secure' : ''}`;

    const defaultCampaignId = user.memberships[0]?.campaignId || null;

    const responsePayload = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        organizationId: user.organizationId,
        defaultCampaignId,
      },
    };

    const requestId = crypto.randomUUID();
    return new Response(
      JSON.stringify({
        success: true,
        data: responsePayload,
        meta: {
          timestamp: new Date().toISOString(),
          message: 'Login successful',
        },
        requestId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err: any) {
    console.error('Error in /api/v1/auth/login:', err);
    return apiError('INTERNAL_ERROR', 'Login failed', 500, String(err));
  }
}
