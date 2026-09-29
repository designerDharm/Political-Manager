# RECOVERY STEP 10 — VIS DATA MODEL & STATUTORY SEPARATION SPECIFICATION
**CampaignOps AI Platform**
**Date:** September 2026

---

## 1. Statutory Mandate & Architectural Principle
In democratic electoral administration, **Voter Information Slips (VIS)** serve solely as non-partisan facilitation instruments to guide voters to their registered polling station and serial number.

### Absolute Invariant: VIS Issued != Voted
1. **Zero Secret-Ballot Correlation**: Issuing or printing a VIS does **NOT** indicate whether a citizen voted, will vote, or which candidate/party they support.
2. **Strict Operational Decoupling**: All data fields, endpoints, and database models strictly forbid fields such as `votedFor`, `persuadability`, `politicalPreference`, `supporterTag`, or `turnoutProbability`.
3. **Turnout as Aggregate Only**: Turnout monitoring is recorded strictly as aggregate, hourly count snapshots (`TurnoutSnapshot`) at the booth level, not associated with individual voter IDs.

---

## 2. PostgreSQL Relational Data Contracts

### 2.1 VisEvent Model
Located in `prisma/schema.prisma`:
```prisma
model VisEvent {
  id              String      @id @default(uuid())
  voterId         String
  campaignId      String
  boothId         String
  issuedById      String?
  issuedAt        DateTime    @default(now())
  channel         VisChannel  @default(IN_PERSON)
  referenceCode   String      @unique
  deliveryStatus  VisDelivery @default(ISSUED)
  notes           String?
  syncedAt        DateTime?
  offlineClientId String?

  voter           Voter       @relation(fields: [voterId], references: [id], onDelete: Cascade)
  campaign        Campaign    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  booth           Booth       @relation(fields: [boothId], references: [id], onDelete: Cascade)
  issuedBy        User?       @relation(fields: [issuedById], references: [id], onDelete: SetNull)

  @@index([campaignId, boothId])
  @@index([voterId])
}

enum VisChannel {
  IN_PERSON
  SMS
  WHATSAPP
  PRINT
}

enum VisDelivery {
  ISSUED
  DELIVERED
  FAILED
  REPRINTED
}
```

### 2.2 TurnoutSnapshot Model
```prisma
model TurnoutSnapshot {
  id            String   @id @default(uuid())
  boothId       String
  recordedAt    DateTime @default(now())
  totalReported Int
  percentage    Float
  source        String   @default("OBSERVER") // "OFFICIAL_ENTRY" | "AUTHORIZED_POLLING_AGENT"
  notes         String?

  booth         Booth    @relation(fields: [boothId], references: [id], onDelete: Cascade)

  @@index([boothId, recordedAt])
}
```

---

## 3. Anti-IDOR & Relational Verification Rules

When recording a `VIS_ISSUE` or `VIS_REISSUE` mutation:
1. **Campaign Isolation**: The target `Voter` must have `campaignId == currentCampaignId`.
2. **Booth Verification**: The `targetBoothId` must match the voter's actual registered booth (`voter.boothId == targetBoothId`). If mismatch, returns `400 Bad Request: IDOR_BOOTH_MISMATCH`.
3. **Agent Scope Enforcement**: If called by `POLITICAL_AGENT`, the target booth must belong to the agent's active assignments (`Assignment.boothId == targetBoothId`). Out-of-scope requests return `403 Forbidden`.
4. **Duplicate First-Issue Prevention**: If an active `VisEvent` already exists for `voterId`, a second `VIS_ISSUE` returns `409 Conflict: DUPLICATE_VIS_ISSUE`. An explicit `VIS_REISSUE` action is required, which marks the new slip with `deliveryStatus: 'REPRINTED'`.

---

## 4. Aggregate Turnout Rules
1. **Strict Invariant**: `0 <= totalReported <= booth.totalElectors`. Under no circumstances may reported turnout exceed the booth's registered electors. Values `< 0` or `> totalElectors` are rejected with `400 Bad Request`.
2. **Server-Authoritative Calculation**: Turnout percentage is strictly computed on the server: `pct = (totalElectors > 0) ? Math.min(100, Math.max(0, Math.round((reported / totalElectors) * 1000) / 10)) : 0` ensuring `0.0 <= percentage <= 100.0`. Client-supplied percentages are overridden by server truth.
3. **Source Integrity**: Must identify authorized polling agent (`AUTHORIZED_POLLING_AGENT`) or official booth entry (`OFFICIAL_ENTRY`).
