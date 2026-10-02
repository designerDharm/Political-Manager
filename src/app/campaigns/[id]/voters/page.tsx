import React from 'react';
import { prisma } from '@/lib/prisma';
import VoterListClient from '@/components/voters/VoterListClient';

export const revalidate = 0; // Dynamic database query (SSoT)

export default async function VoterListPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { boothId?: string; wardId?: string };
}) {
  const boothId = searchParams?.boothId;
  const wardId = searchParams?.wardId;

  // Resolve scope and validate campaign relationship
  let activeScopeHeading = 'Campaign Electorate (All Booths)';
  let scopeBadge = 'All Wards & Booths';
  const voterWhere: any = { campaignId: params.id };
  const householdWhere: any = { campaignId: params.id };

  if (boothId) {
    const booth = await prisma.booth.findFirst({
      where: { id: boothId, campaignId: params.id },
      include: { ward: true },
    });
    if (booth) {
      voterWhere.boothId = boothId;
      householdWhere.boothId = boothId;
      activeScopeHeading = `Booth ${booth.boothNumber} - ${booth.name}`;
      scopeBadge = booth.ward ? `Ward ${booth.ward.wardNumber}: ${booth.name}` : booth.name;
    }
  } else if (wardId) {
    const ward = await prisma.ward.findFirst({
      where: { id: wardId, campaignId: params.id },
    });
    if (ward) {
      voterWhere.wardId = wardId;
      householdWhere.wardId = wardId;
      activeScopeHeading = `Ward ${ward.wardNumber} - ${ward.name}`;
      scopeBadge = `Ward ${ward.wardNumber} - ${ward.name}`;
    }
  }

  const [totalVoters, totalHouseholds, processedCount, voters] = await Promise.all([
    prisma.voter.count({ where: voterWhere }),
    prisma.household.count({ where: householdWhere }),
    prisma.voter.count({ where: { ...voterWhere, status: 'Processed' } }),
    prisma.voter.findMany({
      where: voterWhere,
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
  ]);

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
      activeWardName={scopeBadge}
      activeScopeHeading={activeScopeHeading}
      activeBoothId={boothId}
      activeWardId={wardId}
    />
  );
}
