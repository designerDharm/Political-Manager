# RECOVERY STEP 11 — ANALYTICS API MATRIX & SPECIFICATION
**CampaignOps AI Platform**
**Date:** September 2026

---

## 1. Analytics & Reporting Endpoints

### 1.1 Centralized Operational Analytics
- **Path**: `GET /api/v1/analytics`
- **Purpose**: Authoritative operational analytics query servicing dashboards and analytics charts.
- **Source of Truth**: `src/lib/analytics/metrics.ts` (`getCampaignOperationalMetrics`).
- **Query Parameters**:
  - `campaignId` (string, required or resolved from user session)
  - `wardId` (UUID, optional, validated against campaign)
  - `boothId` (UUID, optional, validated against campaign)
  - `agentId` (UUID, optional, validated against campaign)
  - `timeRange` (`ALL`, `TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS`)
- **Authorization**:
  - `SUPER_ADMIN`: Access to all campaigns.
  - `CAMPAIGN_ADMIN`: Authorized campaign access only.
  - `POLITICAL_AGENT`: Scoped strictly to assigned booths.
- **Response Structure**:
  ```json
  {
    "success": true,
    "data": {
      "campaign": { "id": "...", "name": "...", "status": "ACTIVE" },
      "voters": { "total": 126, "wardDistribution": [...], "boothDistribution": [...] },
      "households": { "total": 55, "visited": 38, "pending": 17, "coveragePercentage": 69.1 },
      "team": { "activeAgents": 2, "activeAssignments": 2, "completedAssignments": 0 },
      "issues": { "total": 3, "open": 3, "resolved": 0, "categoryBreakdown": { "Water": 1 } },
      "electionDay": { "status": "ACTIVE", "totalVisIssued": 2, "latestTurnoutPercentage": 67.5 }
    }
  }
  ```

---

### 1.2 Governed AI Assistant Analytics
- **Path**: `POST /api/v1/analytics/governed`
- **Purpose**: Privacy-governed natural language query interface for operational campaign indicators.
- **Guardrails**: Prohibits voter persuasion terms (`persuadable`, `vote for`, `caste`, `religion`, `leaning`).
- **Authorization**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.

---

### 1.3 Reports & CSV Export Engine
- **Path**: `GET /api/v1/campaigns/[id]/reports`
- **Purpose**: Streaming server-generated CSV exports with formula injection defense and Devanagari UTF-8 BOM.
- **Supported Report Types**:
  1. `OPERATIONAL_SUMMARY`: Ward/booth electors, households, VIS counts, open issues.
  2. `FIELD_OPERATIONS`: Granular door-to-door household visit log with field agents.
  3. `VIS_DELIVERY_LOG`: Statutory non-partisan slip issuance records.
  4. `ISSUES_REGISTER`: Civic grievances, categories, and resolution progress.
  5. `TURNOUT_PROGRESSION`: Periodic observer aggregate turnout snapshots.
- **Security & Safety**:
  - OWASP Formula Injection Shield: Cells beginning with `=`, `+`, `-`, `@` are prepended with `'`.
  - UTF-8 BOM (`\uFEFF`): Ensures proper Hindi/Devanagari rendering in Microsoft Excel.
  - Audit Event: Every export action logs `REPORT_EXPORTED` in `AuditEvent`.
