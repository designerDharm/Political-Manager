import React from 'react';
import { prisma } from '@/lib/prisma';
import HouseholdDetailClient from '@/components/households/HouseholdDetailClient';
import { notFound } from 'next/navigation';

export const revalidate = 0; // Dynamic DB query (Single Source of Truth)

export default async function HouseholdDetailPage({
  params,
}: {
  params: { id: string; hid: string };
}) {
  const household = await prisma.household.findFirst({
    where: {
      campaignId: params.id,
      OR: [
        { id: params.hid },
        { code: params.hid },
      ],
    },
    include: {
      members: {
        orderBy: { serialNumber: 'asc' },
      },
      interactions: {
        include: { agent: true },
        orderBy: { occurredAt: 'desc' },
      },
      booth: {
        include: { ward: true },
      },
    },
  });

  if (!household) {
    notFound();
  }

  return (
    <HouseholdDetailClient
      campaignId={params.id}
      household={{
        id: household.id,
        code: household.code,
        address: household.address,
        houseNumber: household.houseNumber,
        aiConfidence: household.aiConfidence,
        status: household.status,
        evidenceSignals: household.evidenceSignals,
        primaryContactName: household.primaryContactName,
        primaryContactId: household.primaryContactId,
        booth: household.booth,
        members: household.members.map((m) => ({
          id: m.id,
          name: m.name,
          age: m.age,
          gender: m.gender,
          epicNumber: m.epicNumber,
          roleInHousehold: m.roleInHousehold,
          relationshipType: m.relationshipType,
          guardianName: m.guardianName,
        })),
        interactions: household.interactions.map((i) => ({
          id: i.id,
          status: i.status,
          notes: i.notes,
          occurredAt: i.occurredAt.toISOString(),
          agent: i.agent ? { displayName: i.agent.displayName } : null,
        })),
      }}
    />
  );
}
