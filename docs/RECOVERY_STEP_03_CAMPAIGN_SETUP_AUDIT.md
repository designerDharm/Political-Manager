# RECOVERY STEP 03 — CAMPAIGN SETUP & GEOGRAPHY AUDIT
**Date:** 2026-09-28  
**Component:** Campaign Provisioning, Geography Modeling, Ward/Booth Scaffolding & Safe Margin Planning  
**SSoT Database:** PostgreSQL 16 (Relational Schema `campaignops`)

---

## 1. Executive Summary
Prior to Recovery Step 3, the campaign creation page was a 4-step wizard that created a shallow `Campaign` row in the database, while wards and booths remained unpersisted or only statically referenced. Furthermore, planning targets like estimated voters, safe margin, and multi-candidate slates were not structured in PostgreSQL.

During this recovery step:
1. The **Prisma schema** was enhanced with normalized planning fields: `estimatedVoters`, `targetVotes`, `safeMarginVotes`, `constituencyName`, `stateName`, `districtName`, `declaredWards`, `declaredBooths`, `declaredVillages`, and `candidateCount`, along with hierarchical `localityType` on `Ward`.
2. All campaign creation, ward generation, and booth configurations were moved strictly into database-first transactional APIs with server-side validation and RBAC enforcement.
3. Cascading relational integrity checks were implemented, ensuring wards and booths with child electors or visits cannot be destructively deleted.
4. Downstream electoral roll import components were linked directly to the live Ward and Booth hierarchy from PostgreSQL.

---

## 2. Field Audit Matrix

| Field | UI Exists? | API Field? | DB Field? | Saved to PostgreSQL? | Editable? | Required? | Conditional? | Used Downstream? | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Campaign Name** | Yes | `name` | `name` | Yes | Yes | Yes | No | Dashboard / TopHeader | PASS |
| **Candidate Name** | Yes | `candidateName` | `candidateName` & `Candidate` table | Yes | Yes | Yes | No | Candidates list / Identity | PASS |
| **Party Affiliation** | Yes | `partyName`, `isIndependent` | `partyName` & `Party` table | Yes | Yes | Yes | No | Ballots / Slates | PASS |
| **Independent Candidate Flag** | Yes | `isIndependent` | Nullable `partyId` on Candidate | Yes | Yes | No | Yes (Party optional) | Nominations | PASS |
| **Number of Candidates** | Yes | `candidateCount` | `candidateCount` | Yes | Yes | No | Yes (Party slates) | Candidate allocation | PASS |
| **Election Level** | Yes | `electionLevel` | `electionLevel` | Yes | No (Locked post-init) | Yes | Yes (13 Indian levels) | Geography hierarchy | PASS |
| **Election Year** | Yes | `electionYear` | `electionYear` | Yes | No (Locked post-init) | Yes | No | ECI cycle | PASS |
| **Election Date** | Yes | `electionDate` | `electionDate` | Yes | Yes | No | No | Countdown / GOTV | PASS |
| **Constituency Name** | Yes | `constituencyName` | `constituencyName` | Yes | Yes | Yes | No | Geographic root | PASS |
| **State / Province** | Yes | `stateName` | `stateName` | Yes | Yes | No | No | State CEO roll source | PASS |
| **District / Region** | Yes | `districtName` | `districtName` | Yes | Yes | No | No | DEO jurisdiction | PASS |
| **Locality Type** | Yes | `localityType` | `localityType` | Yes | Yes | No | Yes (`VILLAGE` vs `WARD`) | Local election area | PASS |
| **Declared Wards / Villages** | Yes | `declaredWards` | `declaredWards` | Yes | Yes | No | Yes | Scaffolding target | PASS |
| **Actual Ward Records** | Yes | `/wards` batch | `Ward` rows | Yes | Yes | Yes | Yes | Booth parent, Voter parent | PASS |
| **Actual Booth Records** | Yes | `/booths` batch | `Booth` rows | Yes | Yes | Yes | No | Part voter roll upload | PASS |
| **Estimated Voters** | Yes | `estimatedVoters` | `estimatedVoters` | Yes | Yes | No | No | Initial planning gauge | PASS |
| **Target Victory Votes** | Yes | `targetVotes` | `targetVotes` | Yes | Yes | No | No | Win threshold planning | PASS |
| **Safe Margin of Votes** | Yes | `safeMarginVotes` | `safeMarginVotes` | Yes | Yes | No | No | Defensive buffer | PASS |
| **Campaign Status** | Yes | `status` | `status` | Yes | Yes | Yes | No | Lifecycle gating | PASS |

---

## 3. Relational Hierarchy & Data Integrity

```
Organization
  └── Campaign (SSoT Root)
        ├── CampaignMembership (User RBAC Scope: CAMPAIGN_ADMIN)
        ├── CampaignCandidate ── Candidate (Party / Independent)
        └── Ward (or Village / Locality)
              └── Booth (Polling Station & Electors)
                    ├── Household (Future Voter Roll Target)
                    └── Voter (Future Electoral List Target)
```

- **Cascading Protection**: Deleting a `Ward` when child `Booth` rows exist returns HTTP 409 Conflict. Deleting a `Booth` when voters or households exist returns HTTP 409 Conflict.
- **Booth Number Uniqueness**: Scoped per campaign to prevent duplicate Part Numbers in the same election context.
