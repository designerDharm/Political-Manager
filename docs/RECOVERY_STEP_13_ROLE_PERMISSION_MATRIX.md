# RECOVERY STEP 13 — ROLE PERMISSION & ACCESS CONTROL MATRIX
# CAMPAIGNOPS AI AUTHORIZATION GOVERNANCE

## 1. Governance Principles
Access control in CampaignOps AI is enforced strictly at both the API layer (Server Authorization Guard) and the Database layer (Scoped Prisma queries). The system enforces 3 primary roles:
1. `SUPER_ADMIN`: Global infrastructure, tenant provisioning, system audit logs, and backup/restore.
2. `CAMPAIGN_ADMIN`: Campaign-level management, ward/booth geography, team assignment, voter roll import/publish, household grouping, field operations monitoring, reports/analytics, and election day oversight.
3. `POLITICAL_AGENT`: Field-level execution restricted strictly to assigned wards/booths, mobile PWA access, voter search within assigned booths, household visit recording, issue reporting, and neutral voter information slip issuance.

---

## 2. API Endpoint Access Matrix

| API Route | Method | SUPER_ADMIN | CAMPAIGN_ADMIN | POLITICAL_AGENT | Unauthenticated | Scope Enforcement Rule |
|---|---|---|---|---|---|---|
| `/api/v1/auth/login` | POST | 200 OK | 200 OK | 200 OK | 200 OK | Public authentication endpoint |
| `/api/v1/auth/me` | GET | 200 OK | 200 OK | 200 OK | 401 Unauthorized | Validates bearer token / session cookie |
| `/api/v1/auth/logout` | POST | 200 OK | 200 OK | 200 OK | 401 Unauthorized | Invalidates session record |
| `/api/v1/campaigns` | GET | 200 (All) | 200 (Assigned) | 403 Forbidden | 401 Unauthorized | Scoped to assigned campaigns for Campaign Admin |
| `/api/v1/campaigns` | POST | 201 Created | 201 Created | 403 Forbidden | 401 Unauthorized | Admin-only creation |
| `/api/v1/campaigns/[id]` | GET | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Checks campaign membership |
| `/api/v1/campaigns/[id]/geography` | GET | 200 OK | 200 OK | 200 (Assigned) | 401 Unauthorized | Agent only receives assigned booths |
| `/api/v1/imports` | POST | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | PDF upload restricted to Campaign Admin |
| `/api/v1/imports/[id]/publish` | POST | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Admin commit of voter roll to main registry |
| `/api/v1/voters` | GET | 200 (All) | 200 (Campaign) | 200 (Booth-only)| 401 Unauthorized | Scoped strictly to `boothId in (agent_assignments)` |
| `/api/v1/households` | GET | 200 (All) | 200 (Campaign) | 200 (Booth-only)| 401 Unauthorized | Scoped strictly to assigned booths |
| `/api/v1/households/groups` | POST | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Campaign Admin manual grouping correction |
| `/api/v1/users` | POST (Agent) | 201 Created | 201 Created | 403 Forbidden | 401 Unauthorized | Campaign Admin can only provision Agents |
| `/api/v1/users` | POST (Super) | 201 Created | **403 Forbidden** | 403 Forbidden | 401 Unauthorized | **Privilege escalation prevention locked** |
| `/api/v1/assignments` | POST | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Admin assigns agents to booths/wards |
| `/api/v1/agent/visits` | POST | 403 Forbidden | 403 Forbidden | 201 Created | 401 Unauthorized | Field visit recorded by assigned agent |
| `/api/v1/sync` | POST | 403 Forbidden | 403 Forbidden | 200 OK | 401 Unauthorized | Offline mutation sync restricted to Agent |
| `/api/v1/turnout` | POST | 201 Created | 201 Created | 201 Created | 401 Unauthorized | Validates `0 <= turnout <= totalElectors` |
| `/api/v1/vis` | POST | 201 Created | 201 Created | 201 Created | 401 Unauthorized | Records non-coercive voter slip issuance |
| `/api/v1/analytics` | GET | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Aggregate operational intelligence |
| `/api/v1/reports` | GET | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | Comprehensive operational reports |
| `/api/v1/exports` | GET | 200 OK | 200 OK | 403 Forbidden | 401 Unauthorized | CSV/JSON data export |
| `/api/v1/backups` | GET, POST | 200 OK | **403 Forbidden** | 403 Forbidden | 401 Unauthorized | Database snapshot restricted to Super Admin |
| `/api/v1/backups/restore` | POST | 200 OK | **403 Forbidden** | 403 Forbidden | 401 Unauthorized | Database restore restricted to Super Admin |
| `/api/v1/audit-logs` | GET | 200 OK | **403 Forbidden** | 403 Forbidden | 401 Unauthorized | Security audit trail restricted to Super Admin |

---

## 3. Secret Ballot & Political Inference Guardrails
The system explicitly rejects queries attempting to compute, infer, or store individual voter political preferences or secret ballot choices.

- If any client requests query parameters such as `persuasionScore`, `politicalLeaning`, `voteChoice`, or `votedForCandidate`:
  - **HTTP Status Returned**: `403 Forbidden`
  - **Error Payload**: `{"error": "Forbidden: Individual vote choice inference is legally protected and prohibited by system guardrails."}`
  - An entry is immediately appended to `audit_logs` flagging unauthorized inference attempts.
