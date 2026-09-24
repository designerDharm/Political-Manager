import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { UserSession, UserRole } from '@/types';

const SESSION_COOKIE_NAME = 'campaignops_session_user';

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const sessionEmail = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // Default to Super Admin for seamless demo experience if cookie not explicitly set
  const emailToLookup = sessionEmail || 'admin@campaignops.ai';

  const user = await prisma.user.findUnique({
    where: { email: emailToLookup },
    include: {
      memberships: {
        include: {
          campaign: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as UserRole,
    organizationId: user.organizationId,
    campaignId: user.memberships[0]?.campaignId,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
}

export function setSessionUser(email: string) {
  // In API routes or server actions
  cookies().set(SESSION_COOKIE_NAME, email, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}
