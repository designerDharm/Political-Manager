# RECOVERY STEP 11 — METRIC DEFINITIONS SPECIFICATION
**CampaignOps AI Platform**
**Date:** September 2026
**Document Version:** 1.0 (Locked Standard)

---

## 1. Core Principles
1. **Single Source of Truth (SSoT)**: All metrics originate strictly from PostgreSQL. No client-side recalculations or secondary state stores may override server aggregates.
2. **Strict Non-Inference**: Metrics represent operational activities and civic administrative milestones only. No voter persuasion scores, political leanings, or vote predictions are permitted.
3. **Explicit Denominators**: Every calculated percentage must specify its authoritative mathematical formula and protect against division by zero.
4. **Distinction Between Planning and Observation**: Campaign target metrics (e.g., `targetVoters`) must always be labeled as "Configured Planning Value", distinct from "Observed Operational Data".

---

## 2. Standardized Operational Metrics

### 2.1 Voter Registry Metrics
- **Total Published Voters (`totalVoters`)**:
  - *Definition*: Count of all verified, published voter records belonging to the campaign scope.
  - *PostgreSQL Expression*: `prisma.voter.count({ where: { campaignId } })`
  - *PII Context*: Public electoral roll data; non-partisan administrative register.
- **Ward Electors**:
  - *Definition*: Published voters residing within a specific Ward.
  - *PostgreSQL Expression*: `prisma.voter.count({ where: { campaignId, wardId } })`
- **Booth Electors (`booth.totalElectors`)**:
  - *Definition*: Published electors assigned to a specific Polling Station / Booth.
  - *PostgreSQL Expression*: `booth.totalElectors || prisma.voter.count({ where: { campaignId, boothId } })`

### 2.2 Household & Field Operations Metrics
- **Total Mapped Households (`totalHouseholds`)**:
  - *Definition*: Total physical family/residence units mapped in the campaign.
  - *PostgreSQL Expression*: `prisma.household.count({ where: { campaignId } })`
- **Visited Households (`visitedHouseholds`)**:
  - *Definition*: Distinct count of households that have had at least one field interaction recorded by an agent (`status IN ('CONTACTED', 'VERIFIED', 'COMPLETED')`) or marked `Verified` / `Confirmed`.
  - *PostgreSQL Expression*: Distinct household count matching completed field interaction or verified status.
  - *Double-Count Guard*: Must count unique household IDs, not total interactions.
- **Pending Households (`pendingHouseholds`)**:
  - *Definition*: Households currently awaiting field visit.
  - *Formula*: $\max(0, \text{totalHouseholds} - \text{visitedHouseholds})$.
- **Household Field Coverage (`coveragePercentage`)**:
  - *Definition*: Proportion of mapped households that have received field contact.
  - *Formula*:
    $$\text{coveragePercentage} = (\text{totalHouseholds} > 0) \ ? \ \min\left(100.0, \text{round}\left(\frac{\text{visitedHouseholds}}{\text{totalHouseholds}} \times 1000\right) / 10\right) : 0.0$$
  - *Denominator*: `totalHouseholds` (strictly mapped residences in campaign scope).
- **Verified Households (`verifiedHouseholds`)**:
  - *Definition*: Households whose family structure, address, and head of household have been confirmed through door-to-door verification.
  - *PostgreSQL Expression*: `prisma.household.count({ where: { campaignId, status: { in: ['Verified', 'Confirmed'] } } })`.

### 2.3 Team & Workload Metrics
- **Active Agents (`activeAgents`)**:
  - *Definition*: Unique users with active campaign membership or active assignments.
  - *PostgreSQL Expression*: `prisma.campaignMembership.count({ where: { campaignId, active: true, role: 'POLITICAL_AGENT' } })`.
- **Active Assignments (`activeAssignments`)**:
  - *Definition*: Current operational task orders assigned to agents (`status = 'Active'`).
  - *PostgreSQL Expression*: `prisma.assignment.count({ where: { campaignId, status: 'Active' } })`.
- **Completed Tasks (`completedTasks`)**:
  - *Definition*: Assignments or tasks marked with `status = 'Completed'`.
  - *PostgreSQL Expression*: `prisma.assignment.count({ where: { campaignId, status: 'Completed' } })`.

### 2.4 Grievance & Issue Metrics
- **Total Issues (`totalIssues`)**:
  - *Definition*: Total civic issues and data corrections logged.
  - *PostgreSQL Expression*: `prisma.issue.count({ where: { campaignId } })`.
- **Open Issues (`openIssues`)**:
  - *Definition*: Issues currently unresolved.
  - *PostgreSQL Expression*: `prisma.issue.count({ where: { campaignId, status: { in: ['OPEN', 'IN_PROGRESS'] } } })`.
- **Resolved Issues (`resolvedIssues`)**:
  - *Definition*: Issues closed or marked resolved.
  - *PostgreSQL Expression*: `prisma.issue.count({ where: { campaignId, status: 'RESOLVED' } })`.

### 2.5 Election Day & Statutory VIS Metrics
- **Total VIS Issued (`totalVisIssued`)**:
  - *Definition*: Total non-partisan Voter Information Slips generated and handed over to citizens.
  - *PostgreSQL Expression*: `prisma.visEvent.count({ where: { campaignId, eventType: { in: ['ISSUED', 'REPRINTED'] } } })`.
  - *Statutory Invariant*: Does NOT equal voted. Zero vote-choice correlation.
- **VIS Reissued / Reprinted (`totalVisReprinted`)**:
  - *Definition*: Duplicate copies requested by citizens due to misplacement.
  - *PostgreSQL Expression*: `prisma.visEvent.count({ where: { campaignId, eventType: 'REPRINTED' } })`.
- **Aggregate Turnout (`latestTurnout`)**:
  - *Definition*: Aggregate elector turnout recorded by authorized observers at booths.
  - *PostgreSQL Expression*: Bounded snapshot from `TurnoutSnapshot` where $0 \le \text{turnoutCount} \le \text{booth.totalElectors}$.
  - *Statutory Invariant*: Turnout represents voter turnout across all political affiliations, NOT candidate votes.

---

## 3. Metric Consistency Matrix Across Application Modules

| Metric Name | Campaign Admin Dashboard | Campaign Analytics Page | Reports & CSV Export | Governed AI Assistant |
| :--- | :--- | :--- | :--- | :--- |
| **Total Voters** | `voterCount` | `voterCount` | `total_voters` in Summary | `voters` in Operational Overview |
| **Total Households** | `householdCount` | `householdCount` | `total_households` in Summary | `totalHouseholds` in Coverage |
| **Visited Households** | `visitedHouseholdCount` | `visitedCount` | `visited_households` | `visitedHouseholds` |
| **Pending Households** | `pendingVisits` | `pendingCount` | `pending_households` | `pendingHouseholds` |
| **Coverage %** | `progressPercent` | `coveragePercent` | `coverage_rate` | `coverageRate` |
| **Open Issues** | `issueCount` (Open) | `issueCount` | `open_issues` | `issues` |
| **VIS Issued** | VIS Counter | VIS Metric | `vis_issued` | `totalVisIssued` |
| **Aggregate Turnout** | Latest Snapshot | Latest Snapshot | Hourly Turnout Rows | `snapshots` Array |
