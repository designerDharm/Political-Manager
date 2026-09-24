import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning database for V2 Schema ---');
  await prisma.approvalRequest.deleteMany({});
  await prisma.securityIncident.deleteMany({});
  await prisma.privacyRequest.deleteMany({});
  await prisma.retentionPolicy.deleteMany({});
  await prisma.privacyPurpose.deleteMany({});
  await prisma.duplicateCandidatePair.deleteMany({});
  await prisma.voterFieldProvenance.deleteMany({});
  await prisma.issueNote.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.turnoutSnapshot.deleteMany({});
  await prisma.visEvent.deleteMany({});
  await prisma.interaction.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.voter.deleteMany({});
  await prisma.household.deleteMany({});
  await prisma.importPage.deleteMany({});
  await prisma.electoralRollImport.deleteMany({});
  await prisma.booth.deleteMany({});
  await prisma.ward.deleteMany({});
  await prisma.constituency.deleteMany({});
  await prisma.campaignCandidate.deleteMany({});
  await prisma.candidateElection.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.party.deleteMany({});
  await prisma.campaignMembership.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.election.deleteMany({});
  await prisma.userDevice.deleteMany({});
  await prisma.auditEvent.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('--- Seeding Organization & Users ---');
  const org = await prisma.organization.create({
    data: {
      name: 'Democratic Operations Group',
      slug: 'dem-ops',
      status: 'ACTIVE',
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@campaignops.ai',
      phone: '+91 98765 43210',
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      avatarUrl: '/avatars/admin.png',
      mfaEnabled: true,
    },
  });

  const campaignAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'rajesh.sharma@campaignops.ai',
      phone: '+91 98765 43211',
      displayName: 'Rajesh Sharma',
      role: 'CAMPAIGN_ADMIN',
      status: 'ACTIVE',
      avatarUrl: '/avatars/rajesh.png',
      mfaEnabled: true,
    },
  });

  const agentRakesh = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'rakesh.yadav@campaignops.ai',
      phone: '+91 98765 43213',
      displayName: 'Rakesh Yadav',
      role: 'POLITICAL_AGENT',
      status: 'ACTIVE',
    },
  });

  console.log('--- Seeding Normalized Election, Party & Candidate ---');
  const election = await prisma.election.create({
    data: {
      organizationId: org.id,
      name: 'State Legislative Assembly 2026',
      level: 'STATE_ASSEMBLY',
      year: 2026,
      electionDate: new Date('2026-02-28'),
      status: 'ACTIVE',
    },
  });

  const party = await prisma.party.create({
    data: {
      organizationId: org.id,
      name: 'Bharat Vikas Party',
      abbreviation: 'BVP',
    },
  });

  const candidate = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      partyId: party.id,
      fullName: 'Rajesh Sharma',
      phone: '+91 98765 43211',
      email: 'rajesh.candidate@bharatvikas.org',
      bio: 'Committed to development, transparency, and accessible civic infrastructure.',
    },
  });

  const constituency = await prisma.constituency.create({
    data: {
      electionId: election.id,
      code: 'AC-45',
      name: 'Central Assembly Constituency',
      state: 'State of Harmony',
      district: 'Metro District',
      boundaryVersion: 1,
    },
  });

  await prisma.candidateElection.create({
    data: {
      candidateId: candidate.id,
      electionId: election.id,
      constituencyId: constituency.id,
    },
  });

  console.log('--- Seeding Campaign ---');
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      electionId: election.id,
      name: 'Sharma for Assembly 2026',
      electionName: 'State Assembly Election 2026',
      electionLevel: 'STATE_ASSEMBLY',
      electionYear: 2026,
      electionDate: new Date('2026-02-28'),
      candidateName: 'Rajesh Sharma',
      partyName: 'Bharat Vikas Party',
      description: 'Development, Good Governance and Stronger Communities',
      status: 'ACTIVE',
      targetVoters: 3200,
      targetCoverage: 80,
    },
  });

  await prisma.campaignCandidate.create({
    data: {
      campaignId: campaign.id,
      candidateId: candidate.id,
      isPrimary: true,
    },
  });

  await prisma.campaignMembership.createMany({
    data: [
      { campaignId: campaign.id, userId: campaignAdmin.id, role: 'CAMPAIGN_ADMIN' },
      { campaignId: campaign.id, userId: agentRakesh.id, role: 'POLITICAL_AGENT', scopeType: 'BOOTH', scopeIds: '["118"]' },
    ],
  });

  console.log('--- Seeding Versioned Wards & Booths ---');
  const ward12 = await prisma.ward.create({
    data: {
      campaignId: campaign.id,
      constituencyId: constituency.id,
      wardNumber: 12,
      name: 'Ward 12 (Central)',
      boundaryVersion: 1,
    },
  });

  const booth118 = await prisma.booth.create({
    data: {
      campaignId: campaign.id,
      wardId: ward12.id,
      boothNumber: 118,
      name: 'Booth 118 - Gandhi Nagar',
      areaLocality: 'Gandhi Nagar',
      pollingStation: 'Govt. Primary School, Room 1',
      totalElectors: 1020,
      status: 'Active',
      coverageStatus: 'Good',
      assignedAgentId: agentRakesh.id,
      latitude: 26.9124,
      longitude: 75.7873,
    },
  });

  console.log('--- Seeding Households & Voters with Field Provenance ---');
  const h1 = await prisma.household.create({
    data: {
      campaignId: campaign.id,
      boothId: booth118.id,
      code: 'H-001',
      address: 'House No. 12, Gandhi Nagar, Ward 12, Near Hanuman Mandir',
      houseNumber: '12',
      primaryContactName: 'Rajesh Kumar',
      aiConfidence: 91,
      status: 'Verified',
      evidenceSignals: JSON.stringify([
        'EXACT_HOUSE_NO',
        'SAME_NORMALIZED_ADDRESS',
        'GUARDIAN_MATCH',
        'PLAUSIBLE_AGE_RELATIONSHIP',
      ]),
      version: 1,
    },
  });

  const v1 = await prisma.voter.create({
    data: {
      campaignId: campaign.id,
      wardId: ward12.id,
      boothId: booth118.id,
      householdId: h1.id,
      serialNumber: 1,
      name: 'Rajesh Kumar',
      guardianName: 'Ram Kumar',
      relationshipType: 'FATHER',
      age: 48,
      gender: 'M',
      epicNumber: 'ABC1234567',
      houseNumber: '12',
      roleInHousehold: 'Head',
      status: 'Processed',
      verificationStatus: 'VERIFIED',
      version: 1,
    },
  });

  const v2 = await prisma.voter.create({
    data: {
      campaignId: campaign.id,
      wardId: ward12.id,
      boothId: booth118.id,
      householdId: h1.id,
      serialNumber: 2,
      name: 'Sunita Devi',
      guardianName: 'Rajesh Kumar',
      relationshipType: 'HUSBAND',
      age: 44,
      gender: 'F',
      epicNumber: 'ABC1234568',
      houseNumber: '12',
      roleInHousehold: 'Spouse',
      status: 'Processed',
      verificationStatus: 'VERIFIED',
      version: 1,
    },
  });

  await prisma.household.update({
    where: { id: h1.id },
    data: { primaryContactId: v1.id },
  });

  // Seed Granular Field Provenance
  await prisma.voterFieldProvenance.createMany({
    data: [
      {
        voterId: v1.id,
        fieldName: 'name',
        currentValue: 'Rajesh Kumar',
        sourceType: 'ELECTORAL_ROLL_OCR',
        confidence: 0.98,
        sourcePage: 1,
      },
      {
        voterId: v1.id,
        fieldName: 'address',
        currentValue: 'House No. 12, Gandhi Nagar, Ward 12',
        sourceType: 'FIELD_AGENT_VERIFIED',
        confidence: 1.0,
        verifiedById: agentRakesh.id,
        verifiedAt: new Date(),
        reason: 'Address and doorstep verified in person',
      },
    ],
  });

  console.log('--- Seeding Privacy Governance & Purpose Registry ---');
  await prisma.privacyPurpose.createMany({
    data: [
      {
        organizationId: org.id,
        code: 'ELECTORAL_ROLL_MANAGEMENT',
        name: 'Electoral Roll Ingestion & Booth Organization',
        description: 'Processing voter list documents to plan geographic field operations.',
        legalBasis: 'Legitimate Campaign Interest / Statutory Electoral Roll Access',
        retentionDays: 180,
      },
      {
        organizationId: org.id,
        code: 'FIELD_VERIFICATION',
        name: 'Field Verification & Citizen Outreach',
        description: 'Door-to-door verification of residence and follow-up logging.',
        legalBasis: 'Direct Citizen Interaction & Verification',
        retentionDays: 90,
      },
      {
        organizationId: org.id,
        code: 'ELECTION_DAY_VIS',
        name: 'Voter Information Slip Delivery',
        description: 'Assisting citizens with their designated polling booth and serial number.',
        legalBasis: 'Non-persuasive Civic Polling Assistance',
        retentionDays: 30,
      },
    ],
  });

  await prisma.retentionPolicy.createMany({
    data: [
      {
        organizationId: org.id,
        entityName: 'Voter',
        lifecycleStage: 'ACTIVE',
        retentionDays: 180,
        actionOnExpiry: 'ARCHIVE',
      },
      {
        organizationId: org.id,
        entityName: 'SecurityIncident',
        lifecycleStage: 'ACTIVE',
        retentionDays: 730,
        actionOnExpiry: 'ARCHIVE',
      },
    ],
  });

  console.log('--- Seeding Strictly Decoupled Election Day Data ---');
  // 1. VIS Event (Delivery assistance)
  await prisma.visEvent.create({
    data: {
      campaignId: campaign.id,
      voterId: v2.id,
      boothId: booth118.id,
      agentId: campaignAdmin.id,
      eventType: 'ISSUED',
      assistance: 'Helped',
      occurredAt: new Date(),
    },
  });

  // 2. Official Turnout Snapshot (Independent of VIS)
  await prisma.turnoutSnapshot.create({
    data: {
      campaignId: campaign.id,
      boothId: booth118.id,
      turnoutHour: '10 AM',
      totalReported: 388,
      percentage: 38.0,
      source: 'AUTHORIZED_POLLING_AGENT',
    },
  });

  console.log('--- Seeding Maker-Checker Approval Request ---');
  await prisma.approvalRequest.create({
    data: {
      organizationId: org.id,
      campaignId: campaign.id,
      actionType: 'LARGE_EXPORT',
      requestedById: campaignAdmin.id,
      payload: JSON.stringify({
        exportType: 'WARD_12_HOUSEHOLDS_CSV',
        recordCount: 892,
        purpose: 'FIELD_AUDIT',
      }),
      status: 'REQUESTED',
    },
  });

  console.log('--- Database seeding for V2 Schema completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
