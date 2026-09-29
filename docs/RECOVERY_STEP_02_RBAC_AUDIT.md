# RECOVERY STEP 2 — RBAC & SCOPE AUDIT
**Project:** CampaignOps AI  
**Audit Date:** 2026-09-28  
**Scope:** Super Admin, Campaign Admin, and Political Agent access rules, data isolation, and API route guards.

---

## 1. Role Capabilities & Security Architecture

### A. SUPER_ADMIN (Platform Owner)
- **Scope:** Global / Platform-wide.
- **Allowed:** Organizations, Campaigns, Users, System Logs, Global Settings, Security, Audits, Database Backups, Political Parties & Free Symbols.
- **Access Level:** Can query and manage all platform data; bypasses campaign-level isolation checks.

### B. CAMPAIGN_ADMIN (Campaign Administrator)
- **Scope:** Campaign-specific (Enforced via `CampaignMembership` where `active: true`).
- **Allowed:** Candidates, Wards, Booths, Voter Registry, Household Dossiers, Campaign Team & Field Tasks, Grievance/Issues Management, Governed AI Analytics, Election-Day Turnout, and non-partisan VIS.
- **Forbidden:** Super Admin endpoints (`/api/v1/admin/*`, `/super-admin/*`), and other campaigns for which they hold no active membership (e.g., Campaign Admin for Campaign A cannot access Campaign B).

### C. POLITICAL_AGENT (Ground Worker)
- **Scope:** Assignment & Assigned Booth/Ward Scope (Enforced via `Assignment` and `CampaignMembership.scopeIds`).
- **Allowed:** View assigned tasks, view households & voters strictly within their assigned booth/ward, record field visits (`Interaction`), file community issues, and perform non-partisan VIS delivery.
- **Forbidden:** Super Admin configuration, Campaign settings, creating campaigns, deleting voters/households, or viewing voters/households belonging to unassigned booths.

---

## 2. API Endpoint RBAC & Scoping Audit Matrix

| Method | Endpoint | Allowed Roles | Campaign Scope | Geographic / Booth Scope | Current Check | Target Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/campaigns` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Filter to user's permitted campaigns (unless SUPER_ADMIN) | None | Requires Auth | Needs Campaign Scoping |
| `POST` | `/api/v1/campaigns` | SUPER_ADMIN, CAMPAIGN_ADMIN | Organization-wide | None | Requires Auth | Needs Role Guard |
| `GET` | `/api/v1/voters` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Must belong to authorized campaign | Scoped to assigned booth(s) for Agent | Requires Auth | Needs Scope Guard |
| `GET` | `/api/v1/voters/[id]` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Must belong to authorized campaign | Must be in assigned booth for Agent | None | Needs Scope Guard |
| `PATCH` | `/api/v1/voters/[id]` | SUPER_ADMIN, CAMPAIGN_ADMIN | Authorized campaign only | None | None | Needs Role Guard |
| `DELETE`| `/api/v1/voters/[id]` | SUPER_ADMIN, CAMPAIGN_ADMIN | Authorized campaign only | None | None | Needs Role Guard |
| `GET` | `/api/v1/households` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Scoped to assigned booth(s) for Agent | None | Needs Scope Guard |
| `GET` | `/api/v1/households/[hid]` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Must be in assigned booth for Agent | None | Needs Scope Guard |
| `POST` | `/api/v1/households/[hid]` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Must be in assigned booth for Agent | None | Needs Scope Guard |
| `GET` | `/api/v1/tasks` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Scoped to Agent's userId for Agent | Requires Auth | Needs Scope Guard |
| `POST` | `/api/v1/tasks` | SUPER_ADMIN, CAMPAIGN_ADMIN | Authorized campaign only | None | None | Needs Role Guard |
| `GET` | `/api/v1/issues` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Scoped to assigned booth(s) for Agent | None | Needs Scope Guard |
| `POST` | `/api/v1/issues` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Scoped to assigned booth(s) for Agent | None | Needs Scope Guard |
| `POST` | `/api/v1/sync` | SUPER_ADMIN, CAMPAIGN_ADMIN, POLITICAL_AGENT | Authorized campaign only | Target entities must be in assigned scope | Partial | Needs Scope Guard |
| `GET` | `/api/v1/admin/*` | SUPER_ADMIN only | Global | None | Requires SUPER_ADMIN | Enforced |
