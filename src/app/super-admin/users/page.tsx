import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminUsersClient from '@/components/super-admin/SuperAdminUsersClient';

export const revalidate = 0;

export default async function SuperAdminUsersPage() {
  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        devices: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    phone: u.phone,
    status: u.status,
    organization: u.organization,
  }));

  return <SuperAdminUsersClient initialUsers={serializedUsers} organizations={organizations} />;
}
