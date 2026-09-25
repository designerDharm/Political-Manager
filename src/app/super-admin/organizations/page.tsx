import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminOrganizationsClient from '@/components/super-admin/SuperAdminOrganizationsClient';

export const revalidate = 0;

export default async function SuperAdminOrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { campaigns: true, users: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const serializedOrgs = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    createdAt: o.createdAt.toISOString(),
    _count: o._count,
  }));

  return <SuperAdminOrganizationsClient initialOrgs={serializedOrgs} />;
}
