# RECOVERY STEP 10 — ELECTION DAY & VIS AUDIT REPORT
# CAMPAIGNOPS AI

Date: 2026-09-29
Branch: main

## 1. Executive Summary

Recovery Step 10 audits the current state of Election Day operations, Voter Information Slip (VIS) issuance, turnout reporting, and agent mobile execution in CampaignOps AI.

Prior to this step:
1. **Separation of Concepts**: The system already established the fundamental legal principle that **VIS issuance is decoupled from voting**, and **VIS issued != voted**.
2. **Missing Operational Workflow**: While the `VisEvent` and `TurnoutSnapshot` models exist in Prisma, the workflow lacked:
   - Campaign-level Election Day activation / status state machine (`NOT_STARTED` -> `ACTIVE` -> `CLOSED`).
   - Duplicate VIS issuance prevention (idempotency by voter, sequence references, and explicit `REISSUED` status).
   - Validation that the requested voter belongs to the target booth (anti-IDOR & booth mismatch protection).
   - Dedicated mobile-first Election Day workspace for Political Agents with rapid voter search, identity verification, neutral assistance marking, and one-tap VIS generation.
   - Aggregate turnout recording endpoint with strict bounds validation (`0 <= turnout <= totalElectors`, `0.0 <= pct <= 100.0`, source attribution).
   - Realtime SSE propagation for `VIS_ISSUED`, `TURNOUT_RECORDED`, `ELECTION_DAY_ACTIVATED`, and `ELECTION_DAY_CLOSED`.
   - Safe offline sync integration in `/api/v1/sync` for `VIS_EVENT` mutations.
3. **Zero Political Inference Verified**: Grep audits across `src/` and `prisma/` confirmed zero active fields or models storing candidate vote choice, supporter/opposition classification, vote probability, or demographic political affinity.

---

## 2. Feature-by-Feature Technical & Functional Matrix

| Feature | UI Component | API Endpoint | DB Model | Real / Mock / Partial | Authorization | Persistence | Problem Identified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Election Day Activation & State** | `/campaigns/[id]/election-day` | `/api/v1/election-day` | `Campaign.electionDate`, `Campaign.status` | Partial | Campaign Admin only | PostgreSQL | Lacked explicit `electionDayStatus` lifecycle (`NOT_STARTED`, `ACTIVE`, `CLOSED`) with activation timestamp and admin actor. |
| **VIS Issuance** | `/campaigns/[id]/vis` | `POST /api/v1/election-day` | `VisEvent` | Partial | Authenticated | PostgreSQL | Permitted arbitrary `boothId` without validating that the target `Voter` actually belongs to that booth; did not check for duplicate issuance or support structured reissue. |
| **VIS Print Preview** | `/campaigns/[id]/vis` modal | Client modal | None | Partial | Client UI | Ephemeral | Used hardcoded "Sunita Devi" mock data in the card preview instead of loading the selected database `Voter`. |
| **Agent Election Day Mode** | None (redirected to generic `/agent`) | None | None | Missing | N/A | None | Political Agents had no dedicated mobile Election Day view (`/agent/election-day`) for rapid booth lookup, voter verification, and one-tap VIS issuance. |
| **Voter Search in Election Day** | `/agent/search` | `GET /api/v1/voters` | `Voter` | Real | Scoped to Agent Booth | PostgreSQL | Standard voter search works, but lacked Election Day operational status badges (`VIS_ISSUED`, `VIS_REQUESTED`, `ASSISTANCE_LOGGED`). |
| **Turnout Recording** | None (read-only stats on admin page) | `POST /api/v1/election-day` | `TurnoutSnapshot` | Partial | Authenticated | PostgreSQL | Had basic endpoint, but lacked validation against `booth.totalElectors`, source validation, and realtime broadcast. |
| **Admin Command Center** | `/campaigns/[id]/election-day` | `GET /api/v1/election-day` | `TurnoutSnapshot`, `VisEvent`, `Booth` | Partial | Campaign Admin | PostgreSQL | Sourced overall counts, but lacked booth-wise breakdown, ward aggregation tables, and live SSE event refetching. |
| **Offline VIS Sync** | None | `/api/v1/sync` | `VisEvent` | Missing | Not handled in sync | None | `/api/v1/sync` rejected `VIS_EVENT` mutations as `UNSUPPORTED_ENTITY_TYPE`. |
| **Audit Events** | None | Prisma `AuditEvent` | `AuditEvent` | Partial | System | PostgreSQL | Did not emit `ELECTION_DAY_ACTIVATED`, `VIS_ISSUED`, `VIS_REISSUED`, or `TURNOUT_RECORDED` into audit log for SSE streaming. |

---

## 3. Concrete Domain Definitions & Invariants

1. **Voter Registry (SSoT)**: Imported in Step 4. Contains name, EPIC, serial number, age, gender, guardian name, boothId, wardId. Immutable on Election Day.
2. **VIS Issuance**: Operational assistance record proving a voter information slip was generated. **Strictly decoupled from ballot cast**:
   - `VIS_ISSUED != VOTED`
   - `VIS_ISSUED != CAMPAIGN_SUPPORT`
3. **Turnout**: Aggregate booth-level elector count and percentage from authorized observers (`TurnoutSnapshot`). Never derived from VIS counts.
4. **Secret Ballot**: Zero storage, inference, or prediction of vote choice.
