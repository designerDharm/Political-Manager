# RECOVERY STEP 6 — TEAM / AGENT ASSIGNMENT & MOBILE FIELD OPERATIONS AUDIT
**CampaignOps AI — Current State Architecture & Audit Findings**

## 1. Feature-by-Feature Matrix

| Feature | UI Location | API Endpoint | DB Model | Real / Mock / Partial | Assignment Scoped? | Persists? | Current Defect / Gap |
|---|---|---|---|---|---|---|---|
| Team Management | `src/app/campaigns/[id]/team/page.tsx` | Sourced via Prisma query | `User`, `CampaignMembership`, `Assignment` | **Partial** | No (Loads all users globally across system rather than campaign members) | Yes | Table lists all users in database regardless of campaign membership; lacks membership creation; "Assign Area" sends task without campaign membership validation. |
| Agent Invitation / Provisioning | `src/components/team/AddTeamMemberModal.tsx` | `POST /api/v1/users` | `User` | **Partial** | No (Creates generic user without CampaignMembership) | Yes | Does not create `CampaignMembership` for the user in the active campaign; creates password without hash if not handled or sets default. |
| Assignment Creation | `src/components/team/AssignAreaForm.tsx` | `POST /api/v1/tasks` | `Assignment` | **Partial** | Partial (Validates role, but not booth-belonging to campaign) | Yes | `POST /api/v1/tasks` accepts text `scopeTarget`; doesn't check if user is already assigned or duplicate active task; doesn't log `ASSIGNMENT_CREATED` audit event. |
| Agent Home Dashboard | `src/app/agent/page.tsx` | Server Component queries Prisma directly | `Household`, `Assignment`, `Campaign` | **Partial** | No (Queries global `prisma.household.count()` and first assignment in DB!) | N/A | Hardcoded to show first user's assignment in DB; aggregates households globally across entire DB rather than authenticated agent's assigned campaign/booth! |
| Agent Tasks View | `src/app/agent/tasks/page.tsx` | Server Component queries Prisma | `Assignment` | **Partial** | No (Queries all assignments in DB globally) | N/A | Loads `prisma.assignment.findMany()` with no filter by logged-in agent userId or campaign; hardcoded links to H-001. |
| Agent Search | `src/app/agent/search/page.tsx` | `GET /api/v1/voters?q=...` | `Voter`, `Household` | **Partial** | Partial (`/api/v1/voters` checks agent booth scope IF `campaignId` is passed, but search page doesn't pass agent's `campaignId`!) | N/A | When `campaignId` is not in search params, defaults to all accessible campaigns; doesn't search household codes directly in OR filter; UI hardcodes "Booth #101 / #102 Scope" in banner. |
| Agent Field Visit | `src/app/agent/visit/[hid]/page.tsx` | `GET /api/v1/households/[hid]`, `POST /api/v1/sync` | `Household`, `Interaction` | **Partial** | Yes (in `GET /api/v1/households/[hid]`) | Partial (Sync route accepts hardcoded deviceId/userId) | "Save" calls `/api/v1/sync` with mock `"campaignId": "camp-default"` and `"userId": "user-agent-01"`; "Add Note" button does not open a note modal; does not allow creating issues or follow-ups. |
| Operational Status | `src/app/agent/visit/[hid]/page.tsx` | `POST /api/v1/households/[hid]` / `/api/v1/sync` | `Interaction`, `Household` | **Partial** | Yes | Partial | Need direct `/api/v1/households/[hid]` POST or synchronous interaction submission with neutral statuses (`NOT_VISITED`, `ATTEMPTED`, `CONTACTED`, `VERIFIED`, `FOLLOW_UP_REQUIRED`). |
| Issue & Follow-up Creation | Missing in Agent Mobile UI | `POST /api/v1/issues` exists | `Issue`, `IssueNote` | **Partial** | Yes (in API) | Yes | Mobile visit UI has no modal/sheet to file an operational issue or follow-up from the field. |
| Agent Profile / Scope Display | Bottom nav has link to `/super-admin` | None dedicated | `User`, `CampaignMembership` | **Mock / Broken** | No | N/A | Mobile bottom nav links "Admin" to `/super-admin` instead of Agent Profile / Active Scope page (`/agent/profile`). |
| Campaign Admin Field Console | `src/app/campaigns/[id]/field/page.tsx` | Server Component queries Prisma | `Household`, `Booth`, `Assignment` | **Partial** | Yes (Scoped to campaign) | Yes | Counts all households globally (`prisma.household.count()` without `campaignId` filter); needs campaign-scoped metrics, recent interactions, open issues. |

---

## 2. Security & IDOR Gaps Identified
1. **Agent Search Scope**:
   In `src/app/agent/search/page.tsx`, `fetch('/api/v1/voters' + query)` does not supply the active `campaignId`. Although `/api/v1/voters` has booth-scoping logic, it checks:
   `if (principal.platformRole === 'POLITICAL_AGENT' && campaignId)` $\rightarrow$ because `campaignId` was missing, it bypassed the booth filter!
2. **Visit Submission Identity**:
   In `src/app/agent/visit/[hid]/page.tsx`, `handleSave` sent hardcoded `'user-agent-01'` and `'camp-default'` to `/api/v1/sync`. It should record real interactions against `POST /api/v1/households/[hid]` using the authenticated session cookie.
3. **Agent Scope Self-Expansion**:
   Political Agents must never create or modify assignments or memberships. Verify that `/api/v1/tasks` rejects `POLITICAL_AGENT` with `403 Forbidden`.
4. **IDOR on Households & Voters**:
   An agent in Booth A attempting to view or visit a Household or Voter in Booth B must be denied with `403 Forbidden`.
