import React from 'react';
import { prisma } from '@/lib/prisma';
import SuperAdminPartiesClient from '@/components/super-admin/SuperAdminPartiesClient';

export const revalidate = 0; // Dynamic DB query

export default async function SuperAdminPartiesPage() {
  const parties = await prisma.party.findMany({
    include: {
      _count: {
        select: { candidates: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serializedParties = parties.map((p) => ({
    id: p.id,
    name: p.name,
    abbreviation: p.abbreviation || '',
    symbolUrl: p.symbolUrl || '',
    createdAt: p.createdAt.toISOString(),
    _count: p._count,
  }));

  return <SuperAdminPartiesClient initialParties={serializedParties} />;
}
