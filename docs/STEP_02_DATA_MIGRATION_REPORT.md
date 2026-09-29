# STEP 2 — DATA MIGRATION REPORT
**Project:** CampaignOps AI  
**Source Database:** SQLite (`backups/pre-postgres-migration/dev.db`)  
**Target Database:** PostgreSQL 16 (`campaignops` on `localhost:5432`)  
**Execution Timestamp:** 2026-09-27T12:20:00+05:30  
**Migration Strategy:** Type-safe programmatic ETL via `@prisma/client` and Prisma DMMF metadata with strict foreign-key dependency ordering.

---

## 1. Table-by-Table Row Count Reconciliation

| Model / Table | SQLite Source Count | PostgreSQL Target Count | Discrepancy | Status |
| :--- | :---: | :---: | :---: | :---: |
| `Organization` | 1 | 1 | 0 | **100% Match** |
| `User` | 2 | 2 | 0 | **100% Match** |
| `Campaign` | 1 | 1 | 0 | **100% Match** |
| `Ward` | 1 | 1 | 0 | **100% Match** |
| `Booth` | 2 | 2 | 0 | **100% Match** |
| `Household` | 5 | 5 | 0 | **100% Match** |
| `Voter` | 10 | 10 | 0 | **100% Match** |
| `Assignment` | 1 | 1 | 0 | **100% Match** |
| `Interaction` | 1 | 1 | 0 | **100% Match** (Pre-test) |
| `AuditEvent` | 5 | 5 | 0 | **100% Match** |
| *Other 21 Empty Models* | 0 | 0 | 0 | **100% Match** |
| **Total Core Records** | **29** | **29** | **0** | **100% Preserved** |

---

## 2. Foreign-Key Dependency Chain Execution Order

Data was loaded following strict referential graph hierarchy:
1. `Organization` (Primary root tenant)
2. `User` (FK: `organizationId` -> `Organization.id`)
3. `Campaign` (FK: `organizationId` -> `Organization.id`)
4. `Ward` (FK: `campaignId` -> `Campaign.id`)
5. `Booth` (FK: `wardId` -> `Ward.id`, `campaignId` -> `Campaign.id`)
6. `Household` (FK: `campaignId` -> `Campaign.id`, `boothId` -> `Booth.id`)
7. `Voter` (FK: `householdId` -> `Household.id`, `boothId` -> `Booth.id`, `wardId` -> `Ward.id`, `campaignId` -> `Campaign.id`)
8. `Assignment` (FK: `userId` -> `User.id`, `campaignId` -> `Campaign.id`)
9. `Interaction` (FK: `voterId` -> `Voter.id`, `householdId` -> `Household.id`, `agentId` -> `User.id`, `campaignId` -> `Campaign.id`)
10. `AuditEvent` (Audit log records)

---

## 3. Data Transformations & Type Casts Handled
- **Timestamps**: SQLite epoch integers/ISO strings safely transformed to PostgreSQL `TIMESTAMP(3)` (`createdAt`, `updatedAt`, `occurredAt`, `lastLoginAt`).
- **Booleans**: SQLite numeric flags (`1`/`0`) converted to native PostgreSQL boolean types (`mfaEnabled`, `isActive`, `isVerified`).
- **JSON Fields**: Stringified JSON payloads parsed into native PostgreSQL `JsonB` structures (`metadata`, `details`, `settings`, `evidenceSignals`).
- **Null Safety**: Optional foreign keys (`electionId`, `candidatePhoto`, `householdId`) preserved without constraint violations.

---

## 4. Relational Integrity Verification
- Verified Voter -> Household & Booth link: Rajesh Kumar (`ABC1234567`) linked to Household `House 12, Street 4, Sector 4` and Booth `Community Center Hall 1`.
- Verified Assignment -> User & Campaign link: Super Administrator assigned to `Sharma for Assembly 2026`.
- Verified Interaction -> Agent & Household link: Visit check-in connected to Super Administrator.
