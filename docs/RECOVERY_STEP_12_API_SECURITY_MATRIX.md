# RECOVERY STEP 12 — API SECURITY & AUTHORIZATION MATRIX

| Route | Method | Required Role | Tenant / Booth Scope Enforced | Anti-IDOR Defense | Audit Event Logged | Status |
|---|---|---|---|---|---|---|
| `/api/v1/admin/backups` | `GET` | `SUPER_ADMIN` | Global platform | None required | None (read) | **PASS** |
| `/api/v1/admin/backups` | `POST` | `SUPER_ADMIN` | Global platform | None required | `BACKUP_CREATED` | **PASS** |
| `/api/v1/admin/backups/[id]/download` | `GET` | `SUPER_ADMIN` | Global platform | Path Traversal / UUID validation | None (read) | **PASS** |
| `/api/v1/admin/backups/[id]/restore` | `POST` | `SUPER_ADMIN` | Global platform | Confirmation phrase + Checksum verification | `RESTORE_STARTED`, `RESTORE_COMPLETED` | **PASS** |
| `/api/v1/organizations` | `GET` | Any Auth | Global platform | None (read) | None | **PASS** |
| `/api/v1/organizations` | `POST` | `SUPER_ADMIN` | Global platform | Slug uniqueness | `CREATE_ORGANIZATION` | **PASS** |
| `/api/v1/parties` | `GET` | Any Auth | Global platform | None (read) | None | **PASS** |
| `/api/v1/parties` | `POST` | `SUPER_ADMIN` | Global platform | Name uniqueness | `CREATE_POLITICAL_PARTY` | **PASS** |
| `/api/v1/parties/[id]` | `PUT` / `DELETE` | `SUPER_ADMIN` | Global platform | Existing candidates conflict check | None | **PASS** |
| `/api/v1/users` | `POST` | `CAMPAIGN_ADMIN` / `SUPER_ADMIN` | Caller Organization & Campaign | Privilege escalation capped to `POLITICAL_AGENT` | `AGENT_ADDED_TO_CAMPAIGN` | **PASS** |
| `/api/v1/imports/[id]/document` | `GET` | `CAMPAIGN_ADMIN` / `SUPER_ADMIN` | Campaign membership | Path traversal verification | None | **PASS** |
| `/api/v1/issues` | `POST` | All Roles | Campaign membership | Agent booth scope verified on `boothId` | `ISSUE_CREATED` | **PASS** |
| `/api/v1/issues/[id]` | `PATCH` | All Roles | Campaign membership | Agent booth scope verified | None | **PASS** |
| `/api/v1/election-day` | `POST` | `CAMPAIGN_ADMIN` / `POLITICAL_AGENT` | Campaign membership | Agent booth scope verified on VIS & Turnout | `VIS_ISSUED`, `TURNOUT_RECORDED` | **PASS** |
| `/api/v1/campaigns/[id]/reports` | `GET` | `CAMPAIGN_ADMIN` / `POLITICAL_AGENT` | Campaign membership | Agent booth scope filtered; Injection escaped | `REPORT_EXPORTED` | **PASS** |
| `/api/v1/sync` | `POST` | `POLITICAL_AGENT` / `CAMPAIGN_ADMIN` | Campaign membership | Agent booth scope + Optimistic versioning | Audit recorded per mutation | **PASS** |
| `/api/v1/realtime` | `GET` (SSE) | All Roles | Campaign membership | Agent booth scope event filtering | Handshake packet | **PASS** |
