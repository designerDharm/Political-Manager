# CURRENT API RUNTIME MATRIX
**Audit Date:** 2026-09-28  

| Method | Endpoint | Auth Required | Role / Scope | DB Access | Mutation | Audit Event | Runtime Status | Issues / Flags |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `GET` | `/api/health` | Public | None | Yes | No | No | WORKING | Returns live DB table counts |
| `POST` | `/api/v1/auth/login` | Public | None | Yes | Yes (Session) | Yes | PARTIAL | Endpoint created; seed passwords pending |
| `POST` | `/api/v1/auth/logout` | Auth | Any | Yes | Yes (Revoke) | Yes | PARTIAL | Clears session cookie |
| `GET` | `/api/v1/auth/me` | Auth | Any | Yes | No | No | PARTIAL | Returns session user principal |
| `GET` | `/api/v1/campaigns` | Auth | All | Yes | No | No | WORKING | Reads from Postgres |
| `POST` | `/api/v1/campaigns` | Auth | Admin | Yes | Yes | No | WORKING | Persists new campaign to Postgres |
| `GET` | `/api/v1/parties` | Public/Auth | All | Yes | No | No | WORKING | Reads political parties from DB |
| `POST` | `/api/v1/parties` | Auth | Super Admin | Yes | Yes | Yes | WORKING | Creates party & symbol in DB |
| `GET` | `/api/v1/voters` | Auth | Campaign | Yes | No | No | WORKING | Paginated, filtered voter query |
| `GET` | `/api/v1/voters/[id]` | Auth | Campaign | Yes | No | No | WORKING | Returns voter dossier |
| `PATCH` | `/api/v1/voters/[id]` | Auth | Admin | Yes | Yes | No | WORKING | Updates voter details in Postgres |
| `DELETE` | `/api/v1/voters/[id]` | Auth | Admin | Yes | Yes | No | WORKING | Deletes voter record in Postgres |
| `GET` | `/api/v1/households` | Auth | Campaign | Yes | No | No | WORKING | Returns households with members |
| `GET` | `/api/v1/households/[hid]` | Auth | Campaign | Yes | No | No | WORKING | Lookup by UUID or code |
| `POST` | `/api/v1/households/[hid]` | Auth | Agent/Admin | Yes | Yes | No | WORKING | Records field interaction notes |
| `GET` | `/api/v1/tasks` | Auth | Campaign/Agent | Yes | No | No | WORKING | Returns agent assignments |
| `POST` | `/api/v1/tasks` | Auth | Admin | Yes | Yes | No | WORKING | Creates assignment in Postgres |
| `GET` | `/api/v1/issues` | Auth | Campaign | Yes | No | No | WORKING | Returns issues with notes |
| `POST` | `/api/v1/issues` | Auth | Agent/Admin | Yes | Yes | No | WORKING | Persists issue to Postgres |
| `POST` | `/api/v1/imports` | Auth | Admin | Yes | Yes | No | MOCK | Stubs OCR results with fixed numbers |
| `POST` | `/api/v1/imports/publish` | Auth | Admin | Yes | Yes | No | WORKING | Publishes verified records to DB |
| `GET` | `/api/v1/election-day` | Auth | Campaign | Yes | No | No | WORKING | Returns turnout & VIS metrics |
| `POST` | `/api/v1/election-day` | Auth | Agent/Admin | Yes | Yes | No | WORKING | Records turnout or VIS issuance |
| `POST` | `/api/v1/analytics/governed` | Auth | Campaign | Yes | No | No | WORKING | Guardrails enforce non-inference |
| `GET` | `/api/v1/realtime` | Public/Auth | None | Yes | No | No | PARTIAL | SSE stream open, client hook missing |
| `GET` | `/api/v1/admin/settings` | Auth | Super Admin | Yes | No | No | WORKING | Reads system configuration |
| `POST` | `/api/v1/admin/settings` | Auth | Super Admin | Yes | Yes | Yes | WORKING | Writes audit event configuration |
| `GET` | `/api/v1/admin/backups` | Auth | Super Admin | Yes | No | No | PARTIAL | Lists backup audit events |
| `POST` | `/api/v1/admin/backups` | Auth | Super Admin | No | File copy | Yes | BROKEN | Attempts to copy SQLite `dev.db` |
