import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { revokeSession, SESSION_COOKIE_NAME, authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const principal = await authenticateRequest(req);

    if (token) {
      await revokeSession(token);
    }

    if (principal) {
      await prisma.auditEvent.create({
        data: {
          organizationId: principal.organizationId,
          action: 'LOGOUT',
          resource: `user:${principal.userId}`,
          details: JSON.stringify({ email: principal.email }),
        },
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    // Clear cookie by setting Max-Age=0
    const cookieHeader = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      isProd ? '; Secure' : ''
    }`;

    const requestId = crypto.randomUUID();
    return new Response(
      JSON.stringify({
        success: true,
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: 'Logged out successfully',
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
    console.error('Error in /api/v1/auth/logout:', err);
    return apiError('INTERNAL_ERROR', 'Logout failed', 500, String(err));
  }
}
