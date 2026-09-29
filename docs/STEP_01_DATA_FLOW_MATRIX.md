# STEP 01 — DATA FLOW MATRIX

**Audit Date:** 2026-09-25  
**Evaluation Criteria:** UI Component → Client Hook/Service → Backend Route → Prisma Model → DB Table → Mutation Persistence

---

| Screen | Route | API | Service / Controller | DB Tables | Real DB | Mock Data | Mutation Persists | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Login** | `/login` | None (Client redirect) | Client side `setTimeout` | `User` | NO | YES | N/A | **PROTOTYPE** |
| **Super Admin Dashboard** | `/super-admin` | Direct Server Query | Prisma direct query | `Organization`, `Campaign`, `User`, `ElectoralRollImport` | YES | PARTIAL (Trend SVG) | N/A | **PARTIAL** |
| **Super Admin Users** | `/super-admin/users` | `GET/POST /api/v1/users` | `src/app/api/v1/users/route.ts` | `User`, `Organization` | YES | NO | YES | **WORKING** |
| **Super Admin Orgs** | `/super-admin/organizations` | `GET/POST /api/v1/organizations`| `src/app/api/v1/organizations/route.ts` | `Organization` | YES | NO | YES | **WORKING** |
| **Super Admin Campaigns**| `/super-admin/campaigns` | Direct Server Query | Prisma direct query | `Campaign`, `Organization` | YES | NO | N/A | **WORKING** |
| **Campaign Provisioning** | `/campaigns/new` | `POST /api/v1/campaigns` | `src/app/api/v1/campaigns/route.ts` | `Campaign`, `Organization` | YES | NO | YES | **WORKING** |
| **Campaign Overview** | `/campaigns/[id]` | Direct Server Query | Prisma direct query | `Campaign`, `Voter`, `Household`, `Issue` | YES | NO | N/A | **WORKING** |
| **Campaign Settings** | `/campaigns/[id]/settings` | None (Static form) | Server component | `Campaign`, `Organization` | YES | YES | NO | **PROTOTYPE** |
| **Voters List** | `/campaigns/[id]/voters` | Direct Server Query | Prisma direct query | `Voter`, `Household`, `Ward`, `Booth` | YES | NO | N/A | **WORKING** |
| **Voter Upload** | `/campaigns/[id]/voters/upload` | `POST /api/v1/imports` | `src/app/api/v1/imports/route.ts` | `ElectoralRollImport` | YES | NO | YES | **WORKING** |
| **Import Review Center** | `/campaigns/[id]/imports/review` | `POST /api/v1/imports/publish` | `src/app/api/v1/imports/publish/route.ts` | `Voter`, `Household`, `Ward`, `Booth` | YES | PARTIAL | YES | **PARTIAL** |
| **Household Details** | `/campaigns/[id]/households/[hid]` | Direct Server Query | Prisma direct query | `Household`, `Voter`, `Interaction` | YES | NO | N/A | **WORKING** |
| **Team Management** | `/campaigns/[id]/team` | `POST /api/v1/tasks`, `POST /api/v1/users` | `tasks/route.ts`, `users/route.ts` | `User`, `Assignment`, `Ward`, `Booth` | YES | NO | YES | **WORKING** |
| **Issues Management** | `/campaigns/[id]/issues` | `GET/POST /api/v1/issues`, `PATCH /api/v1/issues/[id]` | `issues/route.ts` | `Issue`, `IssueNote`, `User` | YES | NO | YES | **WORKING** |
| **Field Operations** | `/campaigns/[id]/field` | Direct Server Query | Prisma direct query | `Household`, `Booth`, `Assignment`, `Interaction` | YES | NO | N/A | **WORKING** |
| **Analytics** | `/campaigns/[id]/analytics` | Direct Server Query | Prisma direct query | `Ward`, `Booth`, `Voter`, `Household` | YES | NO | N/A | **WORKING** |
| **Election Day** | `/campaigns/[id]/election-day` | Direct Server Query | Prisma direct query | `Booth`, `TurnoutSnapshot`, `Voter` | YES | PARTIAL | PARTIAL | **PARTIAL** |
| **VIS Issuance** | `/campaigns/[id]/vis` | Direct Server Query | Prisma direct query | `VisEvent`, `Voter`, `Household` | YES | NO | N/A | **PARTIAL** |
| **Agent Mobile Home** | `/agent` | Direct Server Query | Prisma direct query | `Campaign`, `Household`, `Assignment`, `User` | YES | NO | N/A | **WORKING** |
| **Agent Tasks** | `/agent/tasks` | Direct Server Query | Prisma direct query | `Assignment`, `Campaign`, `Household` | YES | NO | N/A | **WORKING** |
| **Agent Search** | `/agent/search` | `GET /api/v1/voters?q=...` | `voters/route.ts` | `Voter`, `Household` | YES | NO | N/A | **WORKING** |
| **Agent Field Visit** | `/agent/visit/[hid]` | `GET /api/v1/households/[hid]`, `POST /api/v1/sync` | `households/[hid]/route.ts`, `sync/route.ts` | `Household`, `Interaction` | YES | NO | YES | **WORKING** |
