# RECOVERY STEP 10 — ELECTION DAY & VIS API MATRIX
**CampaignOps AI Platform**
**Date:** September 2026

---

## 1. Overview
The Election Day subsystem provides authoritative operational tracking for campaign polling stations, aggregate turnout observations, and non-partisan Voter Information Slip (VIS) distribution.

---

## 2. API Endpoints

### 2.1 GET `/api/v1/election-day`
Retrieves election day operational metrics, booth-wise breakdown, recent VIS events, and aggregate turnout snapshots.

- **Query Parameters**:
  - `campaignId` (string, required): Target campaign ID.
  - `boothId` (string, optional): Specific booth filter.
- **Access Control**:
  - `SUPER_ADMIN` / `CAMPAIGN_ADMIN`: Campaign-wide view across all wards and booths.
  - `POLITICAL_AGENT`: Scoped strictly to assigned booths. Out-of-scope booth filter returns `403 Forbidden`.
- **Response Format**:
```json
{
  "success": true,
  "campaignId": "uuid",
  "electionStatus": "NOT_STARTED | ACTIVE | CLOSED",
  "summary": {
    "totalElectors": 126,
    "totalVisIssued": 1,
    "totalVisDelivered": 1,
    "visCoveragePct": 0.79,
    "aggregateTurnout": 35,
    "aggregateTurnoutPct": 27.78,
    "boothsReporting": 1,
    "totalBooths": 2
  },
  "booths": [
    {
      "id": "uuid",
      "boothNumber": 1,
      "name": "Central School Room 1",
      "totalElectors": 126,
      "visCount": 1,
      "latestTurnout": 35,
      "latestTurnoutPct": 27.78,
      "turnoutSource": "AUTHORIZED_POLLING_AGENT",
      "turnoutTime": "2026-09-29T08:21:00.000Z"
    }
  ],
  "recentVisEvents": [],
  "recentTurnout": []
}
```

---

### 2.2 POST `/api/v1/election-day`
Executes operational state transitions, slip issuance, and aggregate turnout entries.

#### Action 1: `ACTIVATE_ELECTION_DAY`
- **Roles Permitted**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`. (Agents return `403 Forbidden`).
- **Body**: `{ "action": "ACTIVATE_ELECTION_DAY", "campaignId": "uuid" }`
- **Result**: Sets `campaign.electionDayStatus = "ACTIVE"`, emits SSE `ELECTION_DAY_ACTIVATED`.

#### Action 2: `CLOSE_ELECTION_DAY`
- **Roles Permitted**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.
- **Body**: `{ "action": "CLOSE_ELECTION_DAY", "campaignId": "uuid" }`
- **Result**: Sets `campaign.electionDayStatus = "CLOSED"`, emits SSE `ELECTION_DAY_CLOSED`.

#### Action 3: `VIS_ISSUE`
- **Roles Permitted**: All authenticated roles with booth scope.
- **Body**:
  ```json
  {
    "action": "VIS_ISSUE",
    "campaignId": "uuid",
    "voterId": "uuid",
    "boothId": "uuid",
    "channel": "IN_PERSON | SMS | WHATSAPP | PRINT",
    "notes": "string"
  }
  ```
- **Error Codes**:
  - `400`: IDOR booth mismatch (`voter.boothId != boothId`).
  - `403`: Agent not assigned to booth.
  - `409`: First issue duplicate conflict (`ALREADY_ISSUED`). Requires `VIS_REISSUE`.
- **Audit & SSE**: Emits `VIS_ISSUED`, logs `VIS_EVENT_CREATED`.

#### Action 4: `VIS_REISSUE`
- **Roles Permitted**: All authenticated roles with booth scope.
- **Body**: Same as `VIS_ISSUE` with `action: "VIS_REISSUE"`.
- **Result**: Creates new `VisEvent` with `deliveryStatus: "REPRINTED"`, logs `VIS_EVENT_REPRINTED`.

#### Action 5: `TURNOUT_SNAPSHOT`
- **Roles Permitted**: All authenticated roles with booth scope.
- **Body**:
  ```json
  {
    "action": "TURNOUT_SNAPSHOT",
    "campaignId": "uuid",
    "boothId": "uuid",
    "totalReported": 45,
    "percentage": 35.7,
    "source": "AUTHORIZED_POLLING_AGENT",
    "notes": "string"
  }
  ```
- **Error Codes**:
  - `400`: Negative count, percentage > 100, or totalReported > electors * 1.5.
  - `403`: Agent not assigned to booth.
- **Audit & SSE**: Emits `TURNOUT_RECORDED`, logs `TURNOUT_SNAPSHOT_LOGGED`.

---

### 2.3 POST `/api/v1/sync` (Offline Integration)
- Supports mutation entities `'vis'` and `'VIS_EVENT'`.
- Idempotently processes offline queued slip prints with client timestamp preservation (`syncedAt`, `offlineClientId`).
- Strictly rejects out-of-scope offline mutations with `403 Scope Violation`.
