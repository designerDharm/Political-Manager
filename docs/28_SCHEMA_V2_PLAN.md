# Schema V2 Architecture & Data Model — CampaignOps AI

## 1. Principles
- **SSoT**: PostgreSQL/SQLite is authoritative.
- **Reproducibility**: Geography and elections are versioned.
- **Field-Level Provenance**: Every voter data field carries its extraction confidence, source reference, and verification actor.
- **Zero-Inference & Decoupled Metrics**: VIS events and official voter turnout snapshots are kept in separate tables with zero mathematical entanglement.
- **Data Governance**: Built-in purpose registers, retention policies, privacy rights, and maker-checker approval queues.

---

## 2. Models Specification

### 2.1 Election & Candidate Normalization
```prisma
model Election {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  level          String       @default("STATE_ASSEMBLY") // VILLAGE_PANCHAYAT, MUNICIPALITY_CITY, DISTRICT_LOCAL_BODY, STATE_ASSEMBLY, PARLIAMENT_NATIONAL, CUSTOM
  year           Int
  electionDate   DateTime?
  status         String       @default("UPCOMING")
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  campaigns      Campaign[]
  constituencies Constituency[]
  candidates     CandidateElection[]
}

model Party {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  abbreviation   String?
  symbolUrl      String?
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
  candidates     Candidate[]
}

model Candidate {
  id             String              @id @default(uuid())
  organizationId String
  partyId        String?
  fullName       String
  phone          String?
  email          String?
  photoUrl       String?
  bio            String?
  createdAt      DateTime            @default(now())
  organization   Organization        @relation(fields: [organizationId], references: [id])
  party          Party?              @relation(fields: [partyId], references: [id])
  elections      CandidateElection[]
  campaigns      CampaignCandidate[]
}

model CandidateElection {
  id             String       @id @default(uuid())
  candidateId    String
  electionId     String
  constituencyId String?
  candidate      Candidate    @relation(fields: [candidateId], references: [id])
  election       Election     @relation(fields: [electionId], references: [id])
  constituency   Constituency? @relation(fields: [constituencyId], references: [id])
}

model CampaignCandidate {
  id          String    @id @default(uuid())
  campaignId  String
  candidateId String
  isPrimary   Boolean   @default(true)
  campaign    Campaign  @relation(fields: [campaignId], references: [id])
  candidate   Candidate @relation(fields: [candidateId], references: [id])
}
```

### 2.2 Geography Versioning
```prisma
model Constituency {
  id              String       @id @default(uuid())
  electionId      String
  code            String
  name            String
  state           String
  district        String
  boundaryVersion Int          @default(1)
  effectiveFrom   DateTime     @default(now())
  effectiveTo     DateTime?
  geometryGeoJson String?
  election        Election     @relation(fields: [electionId], references: [id])
  wards           Ward[]
  candidateElections CandidateElection[]
}
```

### 2.3 Field-Level Provenance & Duplicate Resolution
```prisma
model VoterFieldProvenance {
  id             String   @id @default(uuid())
  voterId        String
  fieldName      String   // name, age, gender, address, houseNumber, guardianName
  currentValue   String
  previousValue  String?
  sourceType     String   // ELECTORAL_ROLL_OCR, FIELD_AGENT_VERIFIED, ADMIN_CORRECTION
  sourceRecordId String?
  sourcePage     Int?
  confidence     Float    @default(1.0)
  verifiedById   String?
  verifiedAt     DateTime?
  reason         String?
  createdAt      DateTime @default(now())
  voter          Voter    @relation(fields: [voterId], references: [id])
}

model DuplicateCandidatePair {
  id               String    @id @default(uuid())
  campaignId       String
  voterAId         String
  voterBId         String
  similarityScore  Float     // 0.0 - 1.0
  matchedSignals   String    // JSON: ["NAME_PHONETIC", "GUARDIAN_EXACT", "HOUSE_NO"]
  status           String    @default("PENDING_REVIEW") // PENDING_REVIEW, CONFIRMED_DUPLICATE, NOT_DUPLICATE, MERGED
  reviewedById     String?
  reviewedAt       DateTime?
  resolutionNotes  String?
  createdAt        DateTime  @default(now())
}
```

### 2.4 Privacy Governance & Maker-Checker
```prisma
model PrivacyPurpose {
  id             String       @id @default(uuid())
  organizationId String
  code           String       @unique // ELECTORAL_MANAGEMENT, FIELD_VERIFICATION, ISSUE_RESOLUTION, ELECTION_DAY_VIS
  name           String
  description    String
  legalBasis     String
  retentionDays  Int          @default(365)
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model RetentionPolicy {
  id             String       @id @default(uuid())
  organizationId String
  entityName     String       // Voter, Interaction, ImportFile, ExportJob, AuditEvent
  lifecycleStage String       @default("ACTIVE") // ACTIVE, ARCHIVED, RETENTION_HOLD, PURGED
  retentionDays  Int
  actionOnExpiry String       @default("ARCHIVE") // ARCHIVE, ANONYMIZE, PURGE
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model PrivacyRequest {
  id             String       @id @default(uuid())
  organizationId String
  requestNumber  String       @unique // DSR-2026-001
  subjectName    String
  subjectContact String
  requestType    String       // ACCESS, CORRECTION, DELETION, OBJECTION
  status         String       @default("RECEIVED") // RECEIVED, VERIFYING, PROCESSING, COMPLETED, REJECTED
  details        String
  resolution     String?
  receivedAt     DateTime     @default(now())
  completedAt    DateTime?
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model SecurityIncident {
  id             String       @id @default(uuid())
  organizationId String
  incidentNumber String       @unique // SEC-2026-001
  title          String
  severity       String       // LOW, MEDIUM, HIGH, CRITICAL
  status         String       @default("DETECTED") // DETECTED, TRIAGED, CONTAINED, REMEDIATED, CLOSED
  affectedScope  String
  discoveredAt   DateTime     @default(now())
  containedAt    DateTime?
  resolution     String?
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model ApprovalRequest {
  id             String       @id @default(uuid())
  organizationId String
  campaignId     String?
  actionType     String       // BULK_CORRECTION, LARGE_EXPORT, BACKUP_RESTORE, ROLE_ESCALATION, RETENTION_PURGE
  requestedById  String
  payload        String       // JSON payload of proposed change
  status         String       @default("REQUESTED") // REQUESTED, APPROVED, REJECTED, EXECUTED
  reviewedById   String?
  rejectionReason String?
  requestedAt    DateTime     @default(now())
  reviewedAt     DateTime?
}
```
