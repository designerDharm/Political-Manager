import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndKeepSuperAdmin() {
  console.log('--- Cleaning all dummy / demo data & accounts ---');

  // Delete all operational, field, audit, and election data
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

  console.log('--- Creating Official Super Admin Account & Base Organization ---');

  // Create clean master organization
  const masterOrg = await prisma.organization.create({
    data: {
      name: 'CampaignOps Enterprise',
      slug: 'campaignops-master',
      status: 'ACTIVE',
    },
  });

  // Create clean Super Admin account
  const superAdmin = await prisma.user.create({
    data: {
      organizationId: masterOrg.id,
      email: 'admin@campaignops.ai',
      phone: '+91 98765 00001',
      displayName: 'Super Administrator',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mfaEnabled: true,
    },
  });

  // Create initial audit log entry for system bootstrap
  await prisma.auditEvent.create({
    data: {
      organizationId: masterOrg.id,
      actorId: superAdmin.id,
      action: 'SYSTEM_BOOTSTRAP_CLEAN',
      resource: 'SYSTEM',
      details: 'All dummy/demo accounts wiped. Super admin account initialized.',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  });

  console.log('Database successfully cleaned.');
  console.log('Super Admin account created:');
  console.log({
    email: superAdmin.email,
    role: superAdmin.role,
    organization: masterOrg.name,
  });
}

cleanAndKeepSuperAdmin()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
