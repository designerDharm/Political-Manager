const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  const defaultPassword = 'password123';
  const pwdHash = await hashPassword(defaultPassword);

  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Democratic Operations Group',
        slug: 'dem-ops',
        status: 'ACTIVE',
      },
    });
    console.log('Created Organization:', org.name);
  }

  let campaign = await prisma.campaign.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.campaign.findFirst();
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        name: 'Demo Assembly Campaign 2026',
        electionName: 'State Legislative Assembly 2026',
        electionLevel: 'STATE_ASSEMBLY',
        electionYear: 2026,
        status: 'ACTIVE',
        targetVoters: 50000,
        targetCoverage: 80,
      },
    });
    console.log('Created Campaign:', campaign.name);
  }

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@campaignops.ai' },
    update: {
      passwordHash: pwdHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: 'admin@campaignops.ai',
      displayName: 'Super Administrator',
      role: 'SUPER_ADMIN',
      organizationId: org.id,
      passwordHash: pwdHash,
      status: 'ACTIVE',
    },
  });
  console.log('Seeded Super Admin:', superAdmin.email);

  // 2. Campaign Admin
  const campaignAdmin = await prisma.user.upsert({
    where: { email: 'campaign.admin@campaignops.ai' },
    update: {
      passwordHash: pwdHash,
      role: 'CAMPAIGN_ADMIN',
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: 'campaign.admin@campaignops.ai',
      displayName: 'Rajesh Sharma',
      role: 'CAMPAIGN_ADMIN',
      organizationId: org.id,
      passwordHash: pwdHash,
      status: 'ACTIVE',
    },
  });
  console.log('Seeded Campaign Admin:', campaignAdmin.email);

  // 3. Political Agent
  const agent = await prisma.user.upsert({
    where: { email: 'agent@campaignops.ai' },
    update: {
      passwordHash: pwdHash,
      role: 'POLITICAL_AGENT',
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: 'agent@campaignops.ai',
      displayName: 'Rakesh Verma',
      role: 'POLITICAL_AGENT',
      organizationId: org.id,
      passwordHash: pwdHash,
      status: 'ACTIVE',
    },
  });
  console.log('Seeded Agent:', agent.email);

  // Link campaign memberships
  if (campaign) {
    await prisma.campaignMembership.deleteMany({
      where: {
        campaignId: campaign.id,
        userId: { in: [campaignAdmin.id, agent.id] },
      },
    });

    await prisma.campaignMembership.create({
      data: {
        campaignId: campaign.id,
        userId: campaignAdmin.id,
        role: 'CAMPAIGN_ADMIN',
        scopeType: 'ALL',
        scopeIds: '[]',
        active: true,
      },
    });

    const booth = await prisma.booth.findFirst({ where: { campaignId: campaign.id } });
    const boothIds = booth ? [booth.id] : [];
    await prisma.campaignMembership.create({
      data: {
        campaignId: campaign.id,
        userId: agent.id,
        role: 'POLITICAL_AGENT',
        scopeType: 'BOOTH',
        scopeIds: JSON.stringify(boothIds),
        active: true,
      },
    });

    console.log('Linked memberships for campaign:', campaign.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
