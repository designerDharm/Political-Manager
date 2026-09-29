import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { UserRole, UserSession, AuthPrincipal, CampaignAccess } from '@/types';

export const SESSION_COOKIE_NAME = 'campaignops_session';
export const SESSION_TTL_HOURS = 24 * 7; // 7 days

// ---------------------------------------------------------------------------
// Password Hashing (Cryptographic scrypt with salt)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [salt, key] = combinedHash.split(':');
      if (!salt || !key) return resolve(false);
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        const keyBuffer = Buffer.from(key, 'hex');
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      });
    } catch {
      resolve(false);
    }
  });
}

// ---------------------------------------------------------------------------
// Session Token Hashing (SHA-256)
// ---------------------------------------------------------------------------

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

export async function createSession(userId: string, req?: NextRequest): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0].trim() || req?.ip || null;
  const userAgent = req?.headers.get('user-agent') || null;

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { token, expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Authenticated Principal Resolution
// ---------------------------------------------------------------------------

export async function getPrincipalFromToken(token: string): Promise<AuthPrincipal | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            where: { active: true },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date() > session.expiresAt) return null;

  const user = session.user;
  if (!user || user.status !== 'ACTIVE') return null;

  // Check if locked
  if (user.lockedUntil && new Date() < user.lockedUntil) return null;

  // Touch lastSeenAt asynchronously
  prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  }).catch(() => {});

  const campaignMemberships: CampaignAccess[] = user.memberships.map((m) => {
    let scopeIds: string[] = [];
    try {
      scopeIds = JSON.parse(m.scopeIds);
    } catch {
      scopeIds = [];
    }
    return {
      campaignId: m.campaignId,
      role: m.role,
      scopeType: m.scopeType,
      scopeIds,
    };
  });

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    platformRole: user.role as UserRole,
    organizationId: user.organizationId,
    campaignMemberships,
    sessionId: session.id,
  };
}

export async function authenticateRequest(req: NextRequest): Promise<AuthPrincipal | null> {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || bearerToken;
  if (!token) return null;
  return getPrincipalFromToken(token);
}

// ---------------------------------------------------------------------------
// Next.js Server Components getCurrentUser()
// (Zero fallback: strictly returns null if unauthenticated)
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const principal = await getPrincipalFromToken(token);
  if (!principal) return null;

  const user = await prisma.user.findUnique({
    where: { id: principal.userId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as UserRole,
    organizationId: user.organizationId,
    campaignId: principal.campaignMemberships[0]?.campaignId,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    campaigns: principal.campaignMemberships,
  };
}

// ---------------------------------------------------------------------------
// Server-Side Authorization Guards for API Routes
// ---------------------------------------------------------------------------

export async function requireAuth(req: NextRequest): Promise<{ principal: AuthPrincipal } | { error: Response }> {
  const principal = await authenticateRequest(req);
  if (!principal) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { principal };
}

export async function requirePlatformRole(
  req: NextRequest,
  allowedRoles: UserRole[] = ['SUPER_ADMIN']
): Promise<{ principal: AuthPrincipal } | { error: Response }> {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult;

  const { principal } = authResult;
  if (!allowedRoles.includes(principal.platformRole)) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'Insufficient platform permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { principal };
}

export async function requireCampaignAccess(
  reqOrPrincipal: NextRequest | AuthPrincipal,
  campaignId: string,
  allowedRoles: string[] = ['CAMPAIGN_ADMIN', 'BOOTH_MANAGER', 'POLITICAL_AGENT']
): Promise<{ principal: AuthPrincipal; membership?: CampaignAccess } | { error: Response }> {
  let principal: AuthPrincipal;
  if ('platformRole' in reqOrPrincipal && 'userId' in reqOrPrincipal) {
    principal = reqOrPrincipal;
  } else {
    const authResult = await requireAuth(reqOrPrincipal as NextRequest);
    if ('error' in authResult) return authResult;
    principal = authResult.principal;
  }

  // Super Admin has global bypass authority
  if (principal.platformRole === 'SUPER_ADMIN') {
    return { principal };
  }

  const membership = principal.campaignMemberships.find((m) => m.campaignId === campaignId);
  if (!membership || !allowedRoles.includes(membership.role)) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'You do not have access to this campaign' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { principal, membership };
}

// ---------------------------------------------------------------------------
// Agent Assignment & Geographic Scoping Helpers
// ---------------------------------------------------------------------------

export async function getAgentBoothScope(principal: AuthPrincipal, campaignId: string): Promise<string[] | null> {
  // If Super Admin or Campaign Admin, null means ALL booths allowed
  if (principal.platformRole === 'SUPER_ADMIN') return null;

  const membership = principal.campaignMemberships.find((m) => m.campaignId === campaignId);
  if (!membership) return [];

  if (membership.role === 'CAMPAIGN_ADMIN') return null;

  // For Political Agent, resolve booths from active assignments and membership scopeIds
  let allowedBoothIds = new Set<string>();

  // 1. From membership scopeIds
  for (const id of membership.scopeIds) {
    allowedBoothIds.add(id);
  }

  // 2. From database Assignment records
  const assignments = await prisma.assignment.findMany({
    where: {
      userId: principal.userId,
      campaignId,
      status: 'Active',
    },
  });

  for (const a of assignments) {
    if (a.scopeType === 'BOOTH' && a.scopeTarget) {
      // Find booth by ID or number/name
      const booth = await prisma.booth.findFirst({
        where: {
          campaignId,
          OR: [
            { id: a.scopeTarget },
            { name: { contains: a.scopeTarget } },
            { areaLocality: { contains: a.scopeTarget } },
          ],
        },
      });
      if (booth) allowedBoothIds.add(booth.id);
    }
  }

  return Array.from(allowedBoothIds);
}

export async function verifyHouseholdScope(
  principal: AuthPrincipal,
  householdId: string
): Promise<{ allowed: boolean; household?: any }> {
  const household = await prisma.household.findFirst({
    where: {
      OR: [{ id: householdId }, { code: householdId }],
    },
  });

  if (!household) return { allowed: false };

  if (principal.platformRole === 'SUPER_ADMIN') return { allowed: true, household };

  const membership = principal.campaignMemberships.find((m) => m.campaignId === household.campaignId);
  if (!membership) return { allowed: false, household };

  if (membership.role === 'CAMPAIGN_ADMIN') return { allowed: true, household };

  // Agent scope check
  const allowedBooths = await getAgentBoothScope(principal, household.campaignId);
  if (!allowedBooths) return { allowed: true, household };

  if (household.boothId && allowedBooths.includes(household.boothId)) {
    return { allowed: true, household };
  }

  return { allowed: false, household };
}

