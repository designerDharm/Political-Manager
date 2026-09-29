import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const principal = await authenticateRequest(req);
    if (!principal) {
      return apiError('UNAUTHORIZED', 'Not authenticated', 401);
    }

    return apiSuccess({
      user: {
        id: principal.userId,
        email: principal.email,
        displayName: principal.displayName,
        role: principal.platformRole,
        organizationId: principal.organizationId,
        avatarUrl: principal.avatarUrl,
        campaigns: principal.campaignMemberships,
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Failed to retrieve session', 500, String(err));
  }
}
