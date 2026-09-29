# RECOVERY STEP 11 — DASHBOARD, ANALYTICS & REPORTING AUDIT
**CampaignOps AI Platform**
**Date:** September 2026
**Recovery Step:** 11 — Analytics, Dashboards & Export Infrastructure

---

## 1. Scope & Objective
This audit reviews all existing user interfaces, API endpoints, server-side data models, and export mechanics for:
1. **Campaign Admin Dashboard** (`/campaigns/[id]`)
2. **Super Admin Platform Overview** (`/super-admin`)
3. **Political Agent Mobile Home** (`/agent`)
4. **Campaign Analytics Center** (`/campaigns/[id]/analytics`)
5. **Campaign Reports & Data Export Center** (`/campaigns/[id]/reports`)
6. **Governed Analytics AI Assistant** (`/api/v1/analytics/governed`)

All metrics must strictly originate from PostgreSQL as the Single Source of Truth (SSoT). Zero hardcoding, zero simulated curves, zero political preference inference, and zero vote predictions are permitted.

---

## 2. Feature-by-Feature Inventory & Audit Matrix

| Feature | UI Route / Component | API Route | PostgreSQL Source Models | Real / Mock / Partial | Filters Supported | RBAC Scoping | Export Support | Current Audit Findings & Actions Needed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Campaign Admin Dashboard** | `src/app/campaigns/[id]/page.tsx` | Direct server component DB queries | `Campaign`, `Voter`, `Household`, `Issue` | **Partial** | Campaign ID | `CAMPAIGN_ADMIN`, `SUPER_ADMIN` | None directly on page | Needs real assignment counts, verified vs visited distinction, and dynamic ward/booth totals without double-counting. Target values must be clearly labeled as planning configurations. |
| **Super Admin Dashboard** | `src/app/super-admin/page.tsx` | Direct server component DB queries | `Organization`, `Campaign`, `User`, `ElectoralRollImport`, `AuditEvent` | **Partial** | Platform-wide | `SUPER_ADMIN` | None | StatCards derive from DB, but monthly campaign curve SVG had hardcoded coordinates and recent activities had static text. Must hook to actual `AuditEvent` log and dynamic campaign dates. |
| **Political Agent Mobile Home** | `src/app/agent/page.tsx` | Direct server component DB queries | `CampaignMembership`, `Assignment`, `Household`, `Issue` | **Real (DB-backed)** | Agent assigned booth scope | `POLITICAL_AGENT` | None (Mobile operational) | Already uses real SSoT scoped to agent assignments from Step 6. Preserves mobile cards and realtime listener. |
| **Campaign Analytics Page** | `src/app/campaigns/[id]/analytics/page.tsx` | Server component DB queries + `/api/v1/analytics/governed` | `Voter`, `Household`, `Ward`, `Booth`, `Issue`, `Interaction` | **Partial** | Ward picker, Date range | `CAMPAIGN_ADMIN`, `SUPER_ADMIN` | None on page | Bar chart and booth completion bars used simple calculations from total counts rather than ward/booth scoped aggregates. Key insights had hardcoded placeholder percentages. Must connect to unified analytics service. |
| **Governed Analytics AI Assistant** | `src/components/analytics/GovernedAiAssistant.tsx` | `/api/v1/analytics/governed` | `TurnoutSnapshot`, `Household`, `Interaction`, `Issue`, `VisEvent`, `Voter` | **Real (DB-backed)** | Prompt keywords, campaignId | `CAMPAIGN_ADMIN`, `SUPER_ADMIN` | JSON response | Strict non-inference guardrails passed in Step 10. Needs integration with standardized metric definitions. |
| **Campaign Reports & Export Center** | `src/app/campaigns/[id]/reports/page.tsx` | None (mock buttons previously) | `Voter`, `Household`, `VisEvent`, `Issue`, `TurnoutSnapshot` | **Mock / Partial** | Campaign ID | `CAMPAIGN_ADMIN`, `SUPER_ADMIN` | Currently non-functional buttons | The standard report catalog displayed static strings ("12,480 households", "78,432 slips", etc.) and the "Download File" buttons were unbound. Must implement real server-generated CSV and PDF/printable endpoints. |
| **Voters List Export** | `src/components/voters/VoterListClient.tsx` | `/api/v1/voters` | `Voter`, `Household`, `Ward`, `Booth` | **Real data, Missing CSV** | Search query, Gender, Ward | `CAMPAIGN_ADMIN`, `SUPER_ADMIN`, `POLITICAL_AGENT` (scoped) | Missing CSV button | Page has search and pagination, but no direct CSV export button wired to an authorized CSV generator. |

---

## 3. Statutory Separation & Non-Inference Verification
- **Zero Political Profiling**: No fields for `voteChoice`, `persuadable`, `partyAffinity`, or `candidateSupport` exist in the database or analytics output.
- **VIS != Turnout**: Voter Information Slip issuance (`VisEvent`) is tracked strictly as administrative locator aid and completely decoupled from aggregate booth turnout observations (`TurnoutSnapshot`).
- **Turnout Bounds**: Verified invariant $0 \le \text{turnoutCount} \le \text{totalElectors}$ with server-authoritative percentage computation.

---

## 4. Planned Architecture for Step 11
1. **Centralized Operational Analytics Service** (`src/lib/analytics/metrics.ts`):
   - Single authoritative function `getCampaignOperationalMetrics(campaignId, filters)` used across dashboard, analytics, and reports.
   - Guaranteed prevention of double-counting via explicit distinct counting and group-bys.
2. **Dedicated Reports & Exports API** (`src/app/api/v1/campaigns/[id]/reports`):
   - Authoritative generation of CSV and PDF/Printable datasets:
     - `OPERATIONAL_SUMMARY`: Campaign, ward, booth, voter, and household aggregated statistics.
     - `FIELD_OPERATIONS`: Booth-level door-to-door coverage, visited, verified, and pending metrics.
     - `HOUSEHOLD_REGISTER`: Mapped household codes, addresses, verification status, and member counts.
     - `VOTER_REGISTRY`: Published electoral roll data (strictly non-partisan: serial, name, guardian, age, gender, EPIC, house number).
     - `ISSUES_REGISTER`: Logged grievances with codes, categories, priorities, and statuses.
     - `VIS_DELIVERY_LOG`: Non-partisan civic slip distribution records.
     - `TURNOUT_LOG`: Aggregate booth observer turnout snapshots.
   - Sanitized CSV output preventing formula injection (`=`, `+`, `-`, `@`).
   - UTF-8 with BOM preservation for Devanagari/Hindi script rendering.
   - Audit logging of all export actions (`REPORT_EXPORTED`).
3. **Interactive UI Integration**:
   - Modernize `ReportsPage` into an interactive client component connected to real database counts and live export triggers.
   - Update `AnalyticsPage` to bind charts and operational insight cards dynamically to database metrics.
