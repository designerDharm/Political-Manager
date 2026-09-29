# STEP 02 — PRE-MIGRATION STATE REPORT

**Date:** 2026-09-25  
**Source Database Engine:** SQLite (`file:./dev.db`)  
**Backup Location:** `backups/pre-postgres-migration/dev.db` (and `dev.db.bak`)  
**Git Working Commit:** `188fc3f` (`main`)  

---

## 1. Exact Pre-Migration Model Inventory & Row Counts

| # | Prisma Model Name | SQLite Row Count | Primary Key Type | Dependent Parent Relations |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `Organization` | **1** | UUID (`String`) | None (Root entity) |
| 2 | `User` | **2** | UUID (`String`) | `Organization` |
| 3 | `UserDevice` | **0** | UUID (`String`) | `User` |
| 4 | `Election` | **0** | UUID (`String`) | `Organization` |
| 5 | `Party` | **0** | UUID (`String`) | `Organization` |
| 6 | `Candidate` | **0** | UUID (`String`) | `Organization`, `Party` |
| 7 | `CandidateElection` | **0** | Composite ID | `Candidate`, `Election` |
| 8 | `CampaignCandidate` | **0** | Composite ID | `Campaign`, `Candidate` |
| 9 | `Constituency` | **0** | UUID (`String`) | None |
| 10 | `Campaign` | **1** | UUID (`String`) | `Organization`, `Election` (optional) |
| 11 | `CampaignMembership` | **0** | Composite ID | `Campaign`, `User` |
| 12 | `Ward` | **1** | UUID (`String`) | `Campaign` |
| 13 | `Booth` | **2** | UUID (`String`) | `Campaign`, `Ward` |
| 14 | `ElectoralRollImport`| **0** | UUID (`String`) | `Campaign` |
| 15 | `ImportPage` | **0** | UUID (`String`) | `ElectoralRollImport` |
| 16 | `Household` | **5** | UUID (`String`) | `Campaign`, `Booth` |
| 17 | `Voter` | **10** | UUID (`String`) | `Campaign`, `Ward`, `Booth`, `Household` |
| 18 | `VoterFieldProvenance`| **0** | UUID (`String`) | `Voter`, `ElectoralRollImport` |
| 19 | `DuplicateCandidatePair`| **0** | UUID (`String`) | `Voter` |
| 20 | `Assignment` | **1** | UUID (`String`) | `Campaign`, `User` (assigned + createdBy) |
| 21 | `Interaction` | **1** | UUID (`String`) | `Campaign`, `Household`, `User` (agent) |
| 22 | `Issue` | **0** | UUID (`String`) | `Campaign`, `Household`, `Booth`, `User` |
| 23 | `IssueNote` | **0** | UUID (`String`) | `Issue`, `User` |
| 24 | `VisEvent` | **0** | UUID (`String`) | `Campaign`, `Household`, `Voter`, `User` |
| 25 | `TurnoutSnapshot` | **0** | UUID (`String`) | `Campaign`, `Booth` |
| 26 | `PrivacyPurpose` | **0** | UUID (`String`) | `Organization` |
| 27 | `RetentionPolicy` | **0** | UUID (`String`) | `Organization` |
| 28 | `PrivacyRequest` | **0** | UUID (`String`) | `Organization` |
| 29 | `SecurityIncident` | **0** | UUID (`String`) | `Organization` |
| 30 | `ApprovalRequest` | **0** | UUID (`String`) | `Organization` |
| 31 | `AuditEvent` | **5** | UUID (`String`) | `Organization`, `User` |

---

## 2. Critical Entity Data Details
- **Organization:**
  - ID: `ed90d160-eac8-46bf-ae7c-b83c25456136`
  - Name: `CampaignOps Enterprise`
  - Slug: `campaignops-master`
- **Users:**
  - ID: `f9d96591-000f-4868-b895-083c4ea296e4` (`admin@campaignops.ai`, `SUPER_ADMIN`)
  - ID: `2e28bb08-68ba-4ea0-b385-12a837986a9a` (`amit.verma@campaignops.ai`, `CAMPAIGN_ADMIN`)
- **Campaign:**
  - ID: `c67064aa-941d-488a-8c69-c77ebcaa6459` (`Sharma for Assembly 2026`)
- **Ward & Booths:**
  - Ward: `Ward 12 - Central` (Ward Number: 12)
  - Booths: Booth 118 (`Community Center Hall 1`), Booth 101 (`Primary School North Wing`)
- **Households & Voters:**
  - 5 Households (`H-001` through `H-005`), all mapped to Ward 12 & Booths.
  - 10 Electors (`Voter`), all mapped to specific households, booths, and wards.
- **Assignment & Interaction:**
  - 1 active outreach assignment for Booth 118.
  - 1 verified visit interaction logged with timestamp and audit history.
