import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const sqliteDbPath = path.resolve(process.cwd(), 'backups/pre-postgres-migration/dev.db');
const sqlite = new Database(sqliteDbPath, { readonly: true });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://campaignops:campaignops_dev_secret@localhost:5432/campaignops?schema=public',
    },
  },
});

async function migrate() {
  console.log('--- Starting Migration from SQLite to PostgreSQL ---');
  console.log('SQLite source:', sqliteDbPath);

  // 1. Organization
  const orgs = sqlite.prepare('SELECT * FROM Organization').all();
  console.log(`Migrating ${orgs.length} Organizations...`);
  for (const org of orgs) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
      },
    });
  }

  // 2. User
  const users = sqlite.prepare('SELECT * FROM User').all();
  console.log(`Migrating ${users.length} Users...`);
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        organizationId: u.organizationId,
        email: u.email,
        phone: u.phone,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatarUrl,
        mfaEnabled: Boolean(u.mfaEnabled),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }

  // 3. Campaign
  const campaigns = sqlite.prepare('SELECT * FROM Campaign').all();
  console.log(`Migrating ${campaigns.length} Campaigns...`);
  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        organizationId: c.organizationId,
        electionId: c.electionId,
        name: c.name,
        electionName: c.electionName,
        electionLevel: c.electionLevel,
        electionYear: c.electionYear,
        electionDate: c.electionDate ? new Date(c.electionDate) : null,
        candidateName: c.candidateName,
        partyName: c.partyName,
        candidatePhoto: c.candidatePhoto,
        description: c.description,
        status: c.status,
        targetVoters: c.targetVoters,
        targetCoverage: c.targetCoverage,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }

  // 4. Ward
  const wards = sqlite.prepare('SELECT * FROM Ward').all();
  console.log(`Migrating ${wards.length} Wards...`);
  for (const w of wards) {
    await prisma.ward.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        campaignId: w.campaignId,
        constituencyId: w.constituencyId,
        wardNumber: w.wardNumber,
        name: w.name,
        boundaryVersion: w.boundaryVersion,
        createdAt: new Date(w.createdAt),
      },
    });
  }

  // 5. Booth
  const booths = sqlite.prepare('SELECT * FROM Booth').all();
  console.log(`Migrating ${booths.length} Booths...`);
  for (const b of booths) {
    await prisma.booth.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        campaignId: b.campaignId,
        wardId: b.wardId,
        boothNumber: b.boothNumber,
        name: b.name,
        areaLocality: b.areaLocality,
        pollingStation: b.pollingStation,
        totalElectors: b.totalElectors,
        status: b.status,
        coverageStatus: b.coverageStatus,
        assignedAgentId: b.assignedAgentId,
        boundaryVersion: b.boundaryVersion,
        latitude: b.latitude,
        longitude: b.longitude,
        createdAt: new Date(b.createdAt),
      },
    });
  }

  // 6. Household
  const households = sqlite.prepare('SELECT * FROM Household').all();
  console.log(`Migrating ${households.length} Households...`);
  for (const hh of households) {
    await prisma.household.upsert({
      where: { id: hh.id },
      update: {},
      create: {
        id: hh.id,
        campaignId: hh.campaignId,
        boothId: hh.boothId,
        code: hh.code,
        address: hh.address,
        houseNumber: hh.houseNumber,
        primaryContactName: hh.primaryContactName,
        primaryContactId: hh.primaryContactId,
        aiConfidence: hh.aiConfidence,
        status: hh.status,
        evidenceSignals: hh.evidenceSignals,
        version: hh.version,
        createdAt: new Date(hh.createdAt),
        updatedAt: new Date(hh.updatedAt),
      },
    });
  }

  // 7. Voter
  const voters = sqlite.prepare('SELECT * FROM Voter').all();
  console.log(`Migrating ${voters.length} Voters...`);
  for (const v of voters) {
    await prisma.voter.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        campaignId: v.campaignId,
        wardId: v.wardId,
        boothId: v.boothId,
        householdId: v.householdId,
        serialNumber: v.serialNumber,
        name: v.name,
        guardianName: v.guardianName,
        relationshipType: v.relationshipType,
        age: v.age,
        gender: v.gender,
        epicNumber: v.epicNumber,
        houseNumber: v.houseNumber,
        roleInHousehold: v.roleInHousehold,
        phone: v.phone,
        photoUrl: v.photoUrl,
        status: v.status,
        verificationStatus: v.verificationStatus,
        version: v.version,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
      },
    });
  }

  // 8. Assignment
  const assignments = sqlite.prepare('SELECT * FROM Assignment').all();
  console.log(`Migrating ${assignments.length} Assignments...`);
  for (const a of assignments) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        campaignId: a.campaignId,
        userId: a.userId,
        createdById: a.createdById,
        scopeType: a.scopeType,
        scopeTarget: a.scopeTarget,
        taskType: a.taskType,
        status: a.status,
        notes: a.notes,
        dueAt: a.dueAt ? new Date(a.dueAt) : null,
        createdAt: new Date(a.createdAt),
      },
    });
  }

  // 9. Interaction
  const interactions = sqlite.prepare('SELECT * FROM Interaction').all();
  console.log(`Migrating ${interactions.length} Interactions...`);
  for (const i of interactions) {
    await prisma.interaction.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id,
        campaignId: i.campaignId,
        householdId: i.householdId,
        voterId: i.voterId,
        agentId: i.agentId,
        status: i.status,
        notes: i.notes,
        occurredAt: new Date(i.occurredAt),
      },
    });
  }

  // 10. AuditEvent
  const auditEvents = sqlite.prepare('SELECT * FROM AuditEvent').all();
  console.log(`Migrating ${auditEvents.length} AuditEvents...`);
  for (const ev of auditEvents) {
    await prisma.auditEvent.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        organizationId: ev.organizationId,
        campaignId: ev.campaignId,
        actorId: ev.actorId,
        action: ev.action,
        resource: ev.resource,
        details: ev.details,
        ipAddress: ev.ipAddress,
        hash: ev.hash,
        prevHash: ev.prevHash,
        createdAt: new Date(ev.createdAt),
      },
    });
  }

  console.log('\n--- Migration Completed Successfully! ---');
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
