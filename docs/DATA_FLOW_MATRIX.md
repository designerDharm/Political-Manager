# DATA FLOW MATRIX — CAMPAIGNOPS AI

**Audit Date:** 2026-09-25  
**SSoT Compliance Standard:** UI Component → Client Hook/Service → Controller/Route → Prisma Query → PostgreSQL/SQLite Table → Response → UI State

---

## 1. End-to-End Data Flow Map

| # | UI Feature / Screen | Frontend Request / Service | Backend Controller / Route | Prisma Model / Table | Storage Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | **Super Admin Dashboard** | Server Component (`revalidate=0`) | Direct Prisma Query | `Organization`, `Campaign`, `User`, `ElectoralRollImport` | **REAL** |
| 2 | **Create Organization** | `fetch('/api/v1/organizations', POST)` | `src/app/api/v1/organizations/route.ts` | `Organization` | **REAL** |
| 3 | **Create User** | `fetch('/api/v1/users', POST)` | `src/app/api/v1/users/route.ts` | `User` | **REAL** |
| 4 | **Create Campaign** | `fetch('/api/v1/campaigns', POST)` | `src/app/api/v1/campaigns/route.ts` | `Campaign`, `Organization` | **REAL** |
| 5 | **Campaign Overview** | Server Component (`revalidate=0`) | Direct Prisma Query | `Campaign`, `Voter`, `Household`, `Issue` | **REAL** |
| 6 | **Voter Roster / Search** | Server Component + `GET /api/v1/voters` | `src/app/api/v1/voters/route.ts` | `Voter`, `Household`, `Ward`, `Booth` | **REAL** |
| 7 | **Upload Electoral Roll PDF** | `fetch('/api/v1/imports', POST)` | `src/app/api/v1/imports/route.ts` | `ElectoralRollImport`, `ImportPage` | **REAL** |
| 8 | **Publish Roll to Voters/Households** | `fetch('/api/v1/imports/publish', POST)` | `src/app/api/v1/imports/publish/route.ts` | `Voter`, `Household`, `Ward`, `Booth` | **PARTIAL** (Static seed fixture) |
| 9 | **Create Field Assignment** | `fetch('/api/v1/tasks', POST)` | `src/app/api/v1/tasks/route.ts` | `Assignment`, `User`, `Campaign` | **REAL** |
| 10 | **Create Issue / Grievance** | `fetch('/api/v1/issues', POST)` | `src/app/api/v1/issues/route.ts` | `Issue`, `IssueNote`, `User` | **REAL** |
| 11 | **Resolve Issue / Add Note** | `fetch('/api/v1/issues/[id]', PATCH/POST)`| `src/app/api/v1/issues/[id]/route.ts` | `Issue`, `IssueNote` | **REAL** |
| 12 | **Agent Mobile Tasks** | Server Component (`revalidate=0`) | Direct Prisma Query | `Assignment`, `Campaign` | **REAL** |
| 13 | **Agent Mobile Search** | React useState (`mockVoters`) | *No HTTP Request Made* | *None* | **BROKEN / FAKE** |
| 14 | **Agent Mobile Household Visit** | `fetch('/api/v1/sync', POST)` | `src/app/api/v1/sync/route.ts` | `Household`, `Interaction` | **PARTIAL** (UI members mock, sync real) |
| 15 | **Field Operations Dashboard** | Server Component (`revalidate=0`) | Direct Prisma Query | `Household`, `Booth`, `Assignment`, `Interaction` | **REAL** |
| 16 | **Analytics Dashboard** | Server Component (`revalidate=0`) | Direct Prisma Query | `Ward`, `Booth`, `Voter`, `Household` | **REAL** |

---

## 2. Gaps & Missing Layers
1. **Agent Search (`/agent/search`)**: Missing HTTP fetch to `GET /api/v1/voters?q=...`.
2. **Agent Visit View (`/agent/visit/[hid]`)**: Missing dynamic household member retrieval (`GET /api/v1/households/[hid]`).
3. **Electoral Roll Extraction (`/api/v1/imports/publish`)**: Uses pre-coded sample rows instead of parsing dynamic input or stored OCR pages.
