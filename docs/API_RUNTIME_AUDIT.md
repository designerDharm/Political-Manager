# API RUNTIME AUDIT — CAMPAIGNOPS AI

**Audit Date:** 2026-09-25  
**Auditor:** Antigravity AI Engineering Pair  

---

## 1. Complete API Route Audit Matrix

| Method | Path | Controller / Route File | DB Query | Auth / Context | RBAC Check | Validation | Status |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `GET` | `/api/v1/organizations` | `src/app/api/v1/organizations/route.ts` | `prisma.organization.findMany` | Global | Public/Admin | N/A | **REAL** |
| `POST` | `/api/v1/organizations` | `src/app/api/v1/organizations/route.ts` | `prisma.organization.create` | Global | SUPER_ADMIN | Slug/Name check | **REAL** |
| `GET` | `/api/v1/users` | `src/app/api/v1/users/route.ts` | `prisma.user.findMany` | Tenant/Org | Org Admin | Query params | **REAL** |
| `POST` | `/api/v1/users` | `src/app/api/v1/users/route.ts` | `prisma.user.create` | Tenant/Org | Org Admin | Email/Role check | **REAL** |
| `GET` | `/api/v1/campaigns` | `src/app/api/v1/campaigns/route.ts` | `prisma.campaign.findMany` | Org Scope | Multi-tenant | Org ID check | **REAL** |
| `POST` | `/api/v1/campaigns` | `src/app/api/v1/campaigns/route.ts` | `prisma.campaign.create` | Org Scope | CAMPAIGN_ADMIN | Name/Election | **REAL** |
| `GET` | `/api/v1/voters` | `src/app/api/v1/voters/route.ts` | `prisma.voter.findMany` + count | Campaign Scope | Field/Admin | Search/Page/Filter | **REAL** |
| `GET` | `/api/v1/households` | `src/app/api/v1/households/route.ts` | `prisma.household.findMany` | Campaign Scope | Field/Admin | Booth/Limit filter | **REAL** |
| `POST` | `/api/v1/households` | `src/app/api/v1/households/route.ts` | `prisma.household.create` | Campaign Scope | Field/Admin | Code/Address check | **REAL** |
| `GET` | `/api/v1/tasks` | `src/app/api/v1/tasks/route.ts` | `prisma.assignment.findMany` | Campaign Scope | Field/Admin | User/Status filter | **REAL** |
| `POST` | `/api/v1/tasks` | `src/app/api/v1/tasks/route.ts` | `prisma.assignment.create` | Campaign Scope | CAMPAIGN_ADMIN | Scope/User validation | **REAL** |
| `POST` | `/api/v1/imports` | `src/app/api/v1/imports/route.ts` | `prisma.electoralRollImport.create` | Campaign Scope | CAMPAIGN_ADMIN | File/Payload check | **REAL** |
| `POST` | `/api/v1/imports/publish` | `src/app/api/v1/imports/publish/route.ts` | `prisma.$transaction` across Ward/Booth/Household/Voter | Campaign Scope | CAMPAIGN_ADMIN | Campaign ID check | **PARTIAL** (Inserts fixture voters) |
| `POST` | `/api/v1/sync` | `src/app/api/v1/sync/route.ts` | `prisma.household.update`, `prisma.interaction.create` | Agent/Device | FIELD_AGENT | Optimistic version check | **REAL** |
| `GET` | `/api/v1/issues` | `src/app/api/v1/issues/route.ts` | `prisma.issue.findMany` | Campaign Scope | All Roles | Category/Status | **REAL** |
| `POST` | `/api/v1/issues` | `src/app/api/v1/issues/route.ts` | `prisma.issue.create`, `prisma.issueNote.create` | Campaign Scope | All Roles | Title/Description | **REAL** |
| `PATCH`| `/api/v1/issues/[id]` | `src/app/api/v1/issues/[id]/route.ts` | `prisma.issue.update` | Campaign Scope | Assigned/Admin | Status/Resolution | **REAL** |

---

## 2. Issues Requiring Immediate Remediation
1. **`/api/v1/imports/publish`**:
   - Currently hardcodes a `sampleVoters` list during publication.
   - **Remediation:** Must accept parsed voter batches or extract OCR records dynamically from the `ImportPage` rows to maintain Single Source of Truth.
2. **Missing `GET /api/v1/households/[hid]`**:
   - Agent mobile visit screen needs this endpoint to load live household members and status dynamically without mock data.
