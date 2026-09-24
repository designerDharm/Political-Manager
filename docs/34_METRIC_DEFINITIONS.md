# Metric Definitions & Formula Registry — CampaignOps AI

This central registry governs all metrics computed across the backend services, REST APIs, UI dashboards, and governed AI queries. No dashboard or component may invent conflicting calculations.

---

## 1. Operational Field Coverage

### 1.1 Household Coverage %
- **Formula**:
  $$\text{Household Coverage \%} = \left( \frac{\text{Households with at least one qualifying field visit}}{\text{Total eligible households in scope}} \right) \times 100$$
- **Qualifying Statuses**: `VISITED`, `VERIFIED`, `CONTACTED`.
- **Exclusions**: Inactive or archived households.

### 1.2 Contact Coverage %
- **Formula**:
  $$\text{Contact Coverage \%} = \left( \frac{\text{Households with direct human contact established}}{\text{Total households in scope}} \right) \times 100$$
- **Qualifying Statuses**: `CONTACTED`, `VERIFIED`.

### 1.3 Household Verification %
- **Formula**:
  $$\text{Household Verification \%} = \left( \frac{\text{Households with status = 'Verified' confirmed by field agent}}{\text{Total households in scope}} \right) \times 100$$

---

## 2. Team & Task Operations

### 2.1 Task Completion %
- **Formula**:
  $$\text{Task Completion \%} = \left( \frac{\text{Completed Assignments}}{\text{Total Active Assignments}} \right) \times 100$$

### 2.2 Agent Activity Score
- **Formula**:
  $$\text{Agent Activity (Daily)} = \sum \text{Qualifying interactions logged by agent within UTC day}$$

---

## 3. Civic Issues & Follow-ups

### 3.1 Issue Resolution Rate %
- **Formula**:
  $$\text{Issue Resolution \%} = \left( \frac{\text{Issues with status = 'RESOLVED'}}{\text{Total issues logged in scope}} \right) \times 100$$

### 3.2 High-Priority Open Issues
- **Definition**: Count of open or in-progress issues marked `HIGH` or `CRITICAL` priority.

---

## 4. Election-Day Independent Metrics

### 4.1 Aggregate Voter Turnout %
- **Formula**:
  $$\text{Aggregate Turnout \%} = \left( \frac{\text{Official Aggregate Turnout Reported}}{\text{Total Registered Electors in Booth/Ward}} \right) \times 100$$
- **Crucial Rule**: Turnout numbers come strictly from `TurnoutSnapshot` records entered by authorized polling agents. They are **never** inferred from VIS distribution.

### 4.2 VIS Issuance Rate %
- **Formula**:
  $$\text{VIS Issuance \%} = \left( \frac{\text{Unique Voters with VIS Issued}}{\text{Total Registered Electors in Booth/Ward}} \right) \times 100$$
- **Semantics**: Indicates operational distribution progress of location slips. It is strictly an operational delivery metric, not an electoral outcome.
