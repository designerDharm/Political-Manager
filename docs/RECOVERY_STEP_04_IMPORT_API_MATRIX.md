# RECOVERY STEP 4 — IMPORT API MATRIX & SECURITY VERIFICATION

**Date:** 2026-09-28
**Target Environment:** PostgreSQL 16 + Next.js App Router

---

## API Endpoint Matrix

| Method | Endpoint | Description | Auth Required | Authorized Roles | Denial Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/imports` | List import jobs for campaign | Session Cookie | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | 401 Unauthenticated / 403 Forbidden |
| **POST** | `/api/v1/imports` | Multipart PDF upload, OCR extraction & staging | Session Cookie | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | 403 Forbidden (Agents) / 400 Bad Request |
| **GET** | `/api/v1/imports/[id]` | Get import job details & staged `ImportRecord`s | Session Cookie | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | 401 / 403 / 404 |
| **PATCH** | `/api/v1/imports/[id]/records/[recordId]` | Review & correct staged elector fields | Session Cookie | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | 403 Forbidden (Agents) / 404 |
| **POST** | `/api/v1/imports/publish` | Transactionally publish staged electors to `Voter` table | Session Cookie | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | 403 Forbidden (Agents) / 400 |

---

## Security & Isolation Verification

1. **Role-Based Access Control**:
   - Political Agents attempting to upload (`POST /api/v1/imports`) receive HTTP 403 Forbidden.
   - Political Agents attempting to publish (`POST /api/v1/imports/publish`) receive HTTP 403 Forbidden.
   - Unauthenticated requests receive HTTP 401.
2. **Cross-Campaign Isolation**:
   - All import endpoints require session principal to have active membership in the target campaign (`requireCampaignAccess`).
   - Cross-campaign accesses return HTTP 403 Forbidden.
3. **Audit Trail**:
   - `ELECTORAL_ROLL_UPLOADED`: Logged in `AuditEvent` on file ingestion.
   - `IMPORT_PUBLISHED`: Logged in `AuditEvent` on publishing.
4. **Data Provenance**:
   - Each published voter receives a `VoterFieldProvenance` record linking back to the source import record ID, page number, and original OCR text payload.
