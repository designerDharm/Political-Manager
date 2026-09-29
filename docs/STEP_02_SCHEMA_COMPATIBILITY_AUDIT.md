# STEP 02 — SCHEMA COMPATIBILITY AUDIT REPORT

**Date:** 2026-09-25  
**Prisma Version:** `@prisma/client` / `prisma` v5.19.1 - v5.22.0  
**Source Provider:** `sqlite`  
**Target Provider:** `postgresql`  

---

## 1. Compatibility Analysis Across All 31 Models

| Model | Schema Feature / Data Types | Compatibility Status | Notes |
| :--- | :--- | :---: | :--- |
| `Organization` | `String @id @default(uuid())`, `DateTime @default(now())` | **SAFE** | Direct 1:1 mapping in PostgreSQL (`text` / `uuid`, `timestamp`). |
| `User` | `String @id`, `Boolean @default(false)` | **SAFE** | PostgreSQL natively supports boolean. |
| `UserDevice` | `String @id`, `Boolean`, `DateTime` | **SAFE** | Clean standard types. |
| `Election` | `Int @default(2026)`, `DateTime?` | **SAFE** | Direct mapping. |
| `Party` | `String?` nullable attributes | **SAFE** | Direct mapping. |
| `Candidate` | Relations to `Organization`, `Party` | **SAFE** | Foreign keys standard in PostgreSQL. |
| `CandidateElection` | Composite foreign keys | **SAFE** | Fully supported. |
| `CampaignCandidate` | `Boolean @default(true)` | **SAFE** | Fully supported. |
| `Constituency` | `geometryGeoJson String?` | **SAFE** | Valid JSON text. PostGIS geometry columns can be added subsequently without breaking this string column. |
| `Campaign` | `Int @default(0)`, `Int @default(80)` | **SAFE** | Direct mapping. |
| `CampaignMembership`| `scopeIds String @default("[]")` | **SAFE** | Stored as text / stringified JSON. Fully compatible. |
| `Ward` | `Int wardNumber`, `boundaryVersion Int` | **SAFE** | Clean integer types. |
| `Booth` | `Float? latitude`, `Float? longitude` | **SAFE** | Maps cleanly to `double precision` in PostgreSQL. |
| `ElectoralRollImport`| `Float @default(0.95)` | **SAFE** | Direct mapping to `double precision`. |
| `ImportPage` | `rawText String?` | **SAFE** | Maps to `text` in PostgreSQL. |
| `Household` | `version Int @default(1)` (Optimistic locking), `evidenceSignals String` | **SAFE** | Incrementing version works identically in PostgreSQL. |
| `Voter` | `epicNumber String @unique` | **SAFE** | Unique index creates standard unique btree index in PostgreSQL. |
| `VoterFieldProvenance`| `DateTime? verifiedAt` | **SAFE** | Standard timestamp column. |
| `DuplicateCandidatePair`| `similarityScore Float` | **SAFE** | Double precision. |
| `Assignment` | Relations (`AssignedTo`, `CreatedBy`) | **SAFE** | Dual relations to `User` table cleanly supported with named constraints. |
| `Interaction` | Nullable relations to `Household` / `Voter` | **SAFE** | Supported. |
| `Issue` | `code String @unique` | **SAFE** | Supported. |
| `IssueNote` | Cascade relations | **SAFE** | Supported. |
| `VisEvent` | Relations to `Campaign`, `Voter`, `Booth`, `User` | **SAFE** | Supported. |
| `TurnoutSnapshot` | `Float percentage` | **SAFE** | Supported. |
| `PrivacyPurpose` | `code String @unique` | **SAFE** | Supported. |
| `RetentionPolicy` | Clean standard scalar types | **SAFE** | Supported. |
| `PrivacyRequest` | `requestNumber String @unique` | **SAFE** | Supported. |
| `SecurityIncident` | `incidentNumber String @unique` | **SAFE** | Supported. |
| `ApprovalRequest` | `payload String` | **SAFE** | Maps to `text`. |
| `AuditEvent` | `hash String?`, `prevHash String?` | **SAFE** | Maps to `text`. |

---

## 2. Classification Summary
- **SAFE (31/31):** Every model uses standard Prisma primitives (`String`, `Int`, `Float`, `Boolean`, `DateTime`) with standard `@default(uuid())` or `@default(now())`. 
- **REQUIRES_CHANGE (0):** No custom SQLite types or invalid Prisma declarations are present.
- **HIGH_RISK (0):** No raw binary formats or SQLite-only pragma hacks exist.

---

## 3. PostGIS Extension Verification
- The local Homebrew PostgreSQL 16 cluster does not currently have the separate `postgis` binary formula installed (`postgis` not in `pg_available_extensions`). 
- **Compatibility Strategy:** The Prisma schema stores geospatial boundaries as `geometryGeoJson String?` and coordinates as `Float? latitude` / `Float? longitude`. This ensures immediate 100% PostgreSQL operational capability while enabling PostGIS spatial functions as an additive extension.
