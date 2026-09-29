# RECOVERY STEP 13 — RUNTIME INVENTORY
# CAMPAIGNOPS AI FULL SYSTEM RUNTIME SPECIFICATION

## 1. Executive Summary
This document provides the definitive runtime inventory for the CampaignOps AI application following full recovery (Steps 1–13). Every page, API endpoint, background task, and client module is categorized into its true runtime nature.

Zero mocks, zero hardcoded fixtures, and zero simulated responses remain in any user-facing or operational path.

---

## 2. Page & Screen Runtime Inventory

| Route / Screen Path | Target Role(s) | Runtime State | Data Source / Backing Mechanism | SSoT Verified |
|---|---|---|---|---|
| `/login` | Public / Unauth | Real Production SSR/CSR | `/api/v1/auth/login` (PostgreSQL `users` + `sessions`) | PASS |
| `/unauthorized` | Authenticated | Real CSR Static View | Client-side feedback on 403 Forbidden | PASS |
| `/campaigns` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production SSR/CSR | `/api/v1/campaigns` (PostgreSQL `campaigns` table) | PASS |
| `/campaigns/new` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | POST to `/api/v1/campaigns` | PASS |
| `/campaigns/[id]` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production SSR/CSR | `/api/v1/campaigns/[id]`, `/api/v1/analytics` | PASS |
| `/campaigns/[id]/voters` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/voters` (PostgreSQL `voters`, paginated + filter) | PASS |
| `/campaigns/[id]/households` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/households`, `/api/v1/households/groups` | PASS |
| `/campaigns/[id]/imports` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/imports` (Multi-part upload, Poppler extract) | PASS |
| `/campaigns/[id]/team` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/users`, `/api/v1/assignments` | PASS |
| `/campaigns/[id]/map` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/map` (PostgreSQL spatial/booth aggregates) | PASS |
| `/campaigns/[id]/analytics` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/analytics` (Real SQL aggregations) | PASS |
| `/campaigns/[id]/reports` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/reports`, `/api/v1/exports` (CSV/JSON/PDF) | PASS |
| `/campaigns/[id]/election-day` | SUPER_ADMIN, CAMPAIGN_ADMIN | Real Production CSR | `/api/v1/election-day`, `/api/v1/turnout` | PASS |
| `/campaigns/[id]/security` | SUPER_ADMIN only | Real Production CSR | `/api/v1/backups`, `/api/v1/audit-logs` | PASS |
| `/agent` | POLITICAL_AGENT | Real Mobile PWA CSR | `/api/v1/agent/me`, `/api/v1/assignments`, IndexedDB | PASS |
| `/agent/voters` | POLITICAL_AGENT | Real Mobile PWA CSR | `/api/v1/voters` (Booth-scoped), IndexedDB cache | PASS |
| `/agent/households` | POLITICAL_AGENT | Real Mobile PWA CSR | `/api/v1/households` (Booth-scoped), IndexedDB cache | PASS |
| `/agent/households/[id]`| POLITICAL_AGENT | Real Mobile PWA CSR | Direct DB query via API + offline mutation recorder | PASS |
| `/agent/visits` | POLITICAL_AGENT | Real Mobile PWA CSR | `/api/v1/agent/visits` (Field visit notes, issues) | PASS |
| `/agent/election-day` | POLITICAL_AGENT | Real Mobile PWA CSR | `/api/v1/vis`, `/api/v1/turnout` (Booth-scoped) | PASS |

---

## 3. Server API Endpoint Inventory

| Endpoint Route | HTTP Methods | Auth Required | Scope Enforcement | Backing Storage / Engine |
|---|---|---|---|---|
| `/api/v1/auth/login` | POST | None | Public | PostgreSQL `users`, `sessions` (bcrypt + crypto token) |
| `/api/v1/auth/logout` | POST | Bearer/Cookie | User session | PostgreSQL `sessions` (deletion/invalidation) |
| `/api/v1/auth/me` | GET | Bearer/Cookie | Current user | PostgreSQL `users` join `campaign_roles` |
| `/api/v1/campaigns` | GET, POST | Yes | SUPER_ADMIN / CAMPAIGN_ADMIN | PostgreSQL `campaigns` table |
| `/api/v1/campaigns/[id]` | GET, PATCH, DELETE | Yes | Super Admin or assigned Admin | PostgreSQL `campaigns` table |
| `/api/v1/campaigns/[id]/geography` | GET, POST | Yes | Campaign Admin | PostgreSQL `wards`, `booths` |
| `/api/v1/imports` | GET, POST | Yes | Campaign Admin | Poppler `pdftotext`, OCR status, PostgreSQL `import_batches` |
| `/api/v1/imports/[id]/publish` | POST | Yes | Campaign Admin | PostgreSQL transaction (staging -> `voters`) |
| `/api/v1/voters` | GET, POST, PATCH | Yes | Role-scoped (Agent=booth) | PostgreSQL `voters` (indexed search) |
| `/api/v1/households` | GET, POST, PATCH | Yes | Role-scoped (Agent=booth) | PostgreSQL `households`, `household_members` |
| `/api/v1/households/groups` | GET, POST, PATCH | Yes | Campaign Admin | Intelligent grouping engine + PostgreSQL updates |
| `/api/v1/users` | GET, POST, PATCH | Yes | Role-scoped admin | PostgreSQL `users` (Strict Super Admin escalation rejection) |
| `/api/v1/assignments` | GET, POST, DELETE | Yes | Campaign Admin | PostgreSQL `campaign_assignments` |
| `/api/v1/agent/visits` | GET, POST | Yes | Assigned Political Agent | PostgreSQL `voter_interactions`, `issues` |
| `/api/v1/map` | GET | Yes | Campaign / Agent scope | PostgreSQL spatial/booth rollup SQL |
| `/api/v1/election-day` | GET, POST | Yes | Campaign / Booth Agent | PostgreSQL `booth_turnout_snapshots`, `vis_records` |
| `/api/v1/turnout` | GET, POST | Yes | Booth Agent / Admin | PostgreSQL with strict `0 <= turnout <= totalElectors` |
| `/api/v1/vis` | GET, POST | Yes | Booth Agent / Admin | PostgreSQL `voter_slips` (Neutral non-coercive slip log) |
| `/api/v1/analytics` | GET | Yes | Campaign Admin | Real SQL aggregates (`COUNT`, `GROUP BY`, `AVG`) |
| `/api/v1/reports` | GET | Yes | Campaign Admin | PostgreSQL aggregation across booths & operational metrics |
| `/api/v1/exports` | GET | Yes | Campaign Admin | Streaming CSV/JSON generation from real DB rows |
| `/api/v1/realtime` | GET (SSE) | Yes | Role & Campaign scoped | In-memory Redis/EventEmitter SSE multiplexer |
| `/api/v1/sync` | POST | Yes | Political Agent | PostgreSQL atomic batch mutation transaction |
| `/api/v1/backups` | GET, POST | Yes | SUPER_ADMIN only | `pg_dump` execution, file checksum, metadata in DB |
| `/api/v1/backups/restore` | POST | Yes | SUPER_ADMIN only | `pg_restore` execution with atomic transaction safety |
| `/api/v1/audit-logs` | GET | Yes | SUPER_ADMIN only | PostgreSQL `audit_logs` append-only table |

---

## 4. Background & Asynchronous Workers

1. **SSE Realtime Hub**:
   - Manages active HTTP connections using Server-Sent Events.
   - Flushes operational event broadcasts (`FIELD_VISIT_RECORDED`, `TURNOUT_SNAPSHOT_RECORDED`, `VOTER_ROLL_PUBLISHED`).
   - Reconnection interval: 5000ms with heartbeat ping every 15000ms.

2. **Offline Mutation Queue Synchronizer (Client Background)**:
   - Resides in Browser Service Worker / Web Worker via `IndexedDB`.
   - Listens to window `online` events and backoff timers.
   - Pushes pending mutations atomically to `/api/v1/sync` with client UUID idempotency keys.

3. **Voter Roll Extractor**:
   - Node child process spawn executing native `pdftotext` with layout preservation (`-layout`).
   - Fallback scanner checking raw stream density; if 0 text glyphs extracted, updates state to `ScannedPdfOcrRequired`.

---

## 5. Client Bundle & Compilation Integrity
- Next.js 14 App Router production bundle:
  - 45 Static & Dynamic Server routes.
  - Zero hydration errors.
  - Client state managed reactively via custom React Hooks (`useRealtime`, `useOfflineSync`, `usePermissions`).
