# CURRENT DATA FLOW MATRIX
**Audit Date:** 2026-09-28  

| Screen / Feature | UI Component | API Route | Service / Controller | DB Table | Read Works | Write Works | Persistent | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Login** | `src/app/login/page.tsx` | `/api/v1/auth/login` | `src/lib/auth.ts` | `User`, `Session` | PARTIAL | PARTIAL | NO | PARTIAL |
| **Super Admin Overview** | `src/app/super-admin/page.tsx` | Prisma direct server query | Next.js Server Component | `Organization`, `Campaign`, `User` | YES | N/A | YES | WORKING |
| **Super Admin Parties** | `SuperAdminPartiesClient.tsx` | `/api/v1/parties` | Direct Prisma queries | `Party`, `AuditEvent` | YES | YES | YES | WORKING |
| **Campaign Provisioning** | `src/app/campaigns/new/page.tsx` | `/api/v1/campaigns` | Next.js API route | `Campaign`, `Party` | YES | YES | YES | WORKING |
| **Voter Directory** | `VoterListClient.tsx` | `/api/v1/voters`, `/api/v1/voters/[id]` | Server query + API | `Voter`, `Household`, `Ward`, `Booth` | YES | YES | YES | WORKING |
| **Household Dossier** | `HouseholdDetailClient.tsx` | `/api/v1/households/[hid]` | Server query + API | `Household`, `Voter`, `Interaction` | YES | YES | YES | WORKING |
| **Voter Import Review** | `src/app/campaigns/[id]/imports/review/page.tsx` | `/api/v1/imports/publish` | Next.js API route | `Voter`, `Household`, `Ward`, `Booth` | YES | YES | YES | WORKING |
| **Field Console / Tasks** | `src/app/campaigns/[id]/field/page.tsx` | `/api/v1/tasks` | Next.js API route | `Assignment`, `User` | YES | YES | YES | WORKING |
| **Issues / Grievances** | `src/app/campaigns/[id]/issues/page.tsx` | `/api/v1/issues` | Next.js API route | `Issue`, `User`, `Household` | YES | YES | YES | WORKING |
| **Governed Analytics** | `src/app/campaigns/[id]/analytics/page.tsx` | `/api/v1/analytics/governed` | Policy Guardrails + Aggregates | `Household`, `Interaction`, `Issue` | YES | NO | N/A | WORKING |
| **Election Day Ops** | `src/app/campaigns/[id]/election-day/page.tsx` | `/api/v1/election-day` | Next.js API route | `TurnoutSnapshot`, `VisEvent` | PARTIAL | YES | YES | PARTIAL |
| **Agent Tasks** | `src/app/agent/tasks/page.tsx` | Direct Prisma server query | Server Component | `Assignment`, `Campaign` | YES | NO | N/A | WORKING |
| **Agent Visit Execution** | `src/app/agent/visit/[hid]/page.tsx` | Direct form action | Server Component | `Interaction`, `Household` | YES | YES | YES | WORKING |
| **Agent Search** | `src/app/agent/search/page.tsx` | None (Local array state) | None | None | NO | NO | NO | PROTOTYPE |
| **Campaign Map (GIS)** | `src/app/campaigns/[id]/map/page.tsx` | None (Static SVG paths) | None | `Ward`, `Booth` | NO | NO | NO | PROTOTYPE |
