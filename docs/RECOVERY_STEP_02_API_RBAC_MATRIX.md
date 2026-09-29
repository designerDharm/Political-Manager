# RECOVERY STEP 2 — API RBAC MATRIX
**Project:** CampaignOps AI  
**Date:** 2026-09-28  

| API Endpoint | Method | SUPER_ADMIN | CAMPAIGN_ADMIN | POLITICAL_AGENT | Server Scope Enforcement Rule |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/v1/auth/login` | POST | Allowed | Allowed | Allowed | Public credentials validation & session creation |
| `/api/v1/auth/logout` | POST | Allowed | Allowed | Allowed | Revokes active database session and deletes cookie |
| `/api/v1/auth/me` | GET | Allowed | Allowed | Allowed | Returns authenticated principal and campaign memberships |
| `/api/v1/campaigns` | GET | All Campaigns | Permitted Campaigns Only | Permitted Campaigns Only | Filtered at database query level by user's active memberships |
| `/api/v1/campaigns` | POST | Allowed | Allowed | Denied (403) | Only platform and campaign administrators can provision campaigns |
| `/api/v1/voters` | GET | Global | Permitted Campaign Only | Assigned Booth(s) Only | Server applies `campaignId` check and restricts `boothId` for agents |
| `/api/v1/voters/[id]` | GET | Global | Permitted Campaign Only | Assigned Booth Only | Rejects (403) if voter is in unassigned booth or foreign campaign |
| `/api/v1/voters/[id]` | PATCH | Global | Permitted Campaign Only | Denied (403) | Administrative voter edits restricted to Campaign Admin and Super Admin |
| `/api/v1/voters/[id]` | DELETE | Global | Permitted Campaign Only | Denied (403) | Deletion strictly forbidden for Political Agents |
| `/api/v1/households` | GET | Global | Permitted Campaign Only | Assigned Booth(s) Only | Query scoped to assigned booth IDs in Postgres |
| `/api/v1/households/[hid]` | GET | Global | Permitted Campaign Only | Assigned Booth Only | Rejects (403) if household is outside agent's assigned booth |
| `/api/v1/households/[hid]` | POST | Global | Permitted Campaign Only | Assigned Booth Only | Rejects (403) field visit recording if household outside assigned booth |
| `/api/v1/tasks` | GET | Global | Permitted Campaign Only | Own Assigned Tasks Only | Scoped to `userId = principal.userId` for Political Agents |
| `/api/v1/tasks` | POST | Global | Permitted Campaign Only | Denied (403) | Only Campaign Admin and Super Admin can create/assign tasks |
| `/api/v1/issues` | GET | Global | Permitted Campaign Only | Permitted Campaign Only | Scoped to authorized campaign |
| `/api/v1/issues` | POST | Global | Permitted Campaign Only | Permitted Campaign Only | Authoritative `reporterId` bound to session `principal.userId` |
| `/api/v1/sync` | POST | Global | Permitted Campaign Only | Assigned Booth Only | Optimistic mutation rejects `FORBIDDEN_OUTSIDE_ASSIGNED_BOOTH_SCOPE` |
| `/api/v1/election-day` | GET | Global | Permitted Campaign Only | Permitted Campaign Only | Decoupled Turnout & VIS metrics scoped to campaign |
| `/api/v1/election-day` | POST | Global | Permitted Campaign Only | Permitted Campaign Only | Authoritative `agentId` assigned to `principal.userId` |
| `/api/v1/analytics/governed` | POST | Global | Permitted Campaign Only | Denied (403) | Non-inference guardrails and campaign membership verified |
| `/api/v1/admin/settings` | GET/POST | Allowed | Denied (403) | Denied (403) | Restricted to `SUPER_ADMIN` platform role |
| `/api/v1/admin/backups` | GET/POST | Allowed | Denied (403) | Denied (403) | Restricted to `SUPER_ADMIN` platform role |
