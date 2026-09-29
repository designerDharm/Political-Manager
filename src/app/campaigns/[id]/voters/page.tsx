import React from 'react';
import { prisma } from '@/lib/prisma';
import VoterListClient from '@/components/voters/VoterListClient';

export const revalidate = 0; // Dynamic database query (SSoT)

export default async function VoterListPage({
  params,
}: {
  params: { id: string };
}) {
  const [totalVoters, totalHouseholds, processedCount, voters, campaignWards] = await Promise.all([
    prisma.voter.count({ where: { campaignId: params.id } }),
    prisma.household.count({ where: { campaignId: params.id } }),
    prisma.voter.count({ where: { campaignId: params.id, status: 'Processed' } }),
    prisma.voter.findMany({
      where: { campaignId: params.id },
      take: 100,
      orderBy: { serialNumber: 'asc' },
      include: {
        household: {
          select: {
            id: true,
            code: true,
            address: true,
          },
        },
        booth: {
          select: {
            name: true,
            boothNumber: true,
          },
        },
      },
    }),
    prisma.ward.findMany({ where: { campaignId: params.id } }),
  ]);

  const activeWardName = campaignWards[0]?.name || 'Ward 12';

  const serializedVoters = voters.map((v) => ({
    id: v.id,
    serialNumber: v.serialNumber,
    name: v.name,
    guardianName: v.guardianName,
    age: v.age,
    gender: v.gender,
    epicNumber: v.epicNumber,
    houseNumber: v.houseNumber,
    status: v.status,
    verificationStatus: v.verificationStatus,
    phone: v.phone,
    roleInHousehold: v.roleInHousehold,
    household: v.household,
    booth: v.booth,
  }));

  return (
    <VoterListClient
      campaignId={params.id}
      initialVoters={serializedVoters}
      totalVotersCount={totalVoters}
      totalHouseholdsCount={totalHouseholds}
      processedVotersCount={processedCount}
      activeWardName={activeWardName}
    />
  );
}
