# RECOVERY STEP 03 — CAMPAIGN & GEOGRAPHY API MATRIX
**Date:** 2026-09-28  
**Scope:** Campaign Provisioning, Geography Modeling, Wards, Booths & Planning APIs

---

| METHOD | PATH | PURPOSE | ROLE ALLOWED | DB TABLES ACCESSED | SERVER VALIDATION | RESULT CODE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/campaigns` | List permitted campaigns for authenticated user | `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT` | `Campaign`, `CampaignMembership`, `Ward`, `Booth` | Scoped by user membership | 200 OK |
| **POST** | `/api/v1/campaigns` | Create new campaign with candidate and initial settings | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Campaign`, `CampaignMembership`, `Candidate`, `CampaignCandidate`, `AuditEvent` | Validates non-negative numbers, requires name, assigns creator membership | 201 Created / 403 Forbidden for Agent |
| **GET** | `/api/v1/campaigns/[id]` | Fetch full campaign setup, planning targets, and geography counts | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Campaign`, `Organization`, `Election`, `Ward`, `Booth`, `Candidate` | Membership access check | 200 OK / 403 Forbidden |
| **PATCH** | `/api/v1/campaigns/[id]` | Update campaign setup parameters, safe margins, and status | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Campaign`, `AuditEvent` | Precheck validation for activation, non-negative numbers | 200 OK / 403 Forbidden |
| **GET** | `/api/v1/campaigns/[id]/wards` | Retrieve all configured wards and their child booths | `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT` | `Ward`, `Booth` | Campaign access check | 200 OK / 403 Forbidden |
| **POST** | `/api/v1/campaigns/[id]/wards` | Scaffold batch wards or create single ward | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Ward`, `Campaign` | Ward number uniqueness per campaign, range 1-500 | 201 Created / 403 Forbidden |
| **PATCH** | `/api/v1/campaigns/[id]/wards/[wardId]` | Rename ward or change locality type | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Ward` | Ward number conflict detection | 200 OK / 403 Forbidden |
| **DELETE** | `/api/v1/campaigns/[id]/wards/[wardId]` | Delete empty ward | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Ward`, `Booth`, `Voter` | Cascading integrity: blocks deletion if booths or voters exist | 200 OK / 409 Conflict |
| **GET** | `/api/v1/campaigns/[id]/booths` | List booths filtered by ward or agent assignment | `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT` | `Booth`, `Ward` | Scopes agent to assigned booths | 200 OK / 403 Forbidden |
| **POST** | `/api/v1/campaigns/[id]/booths` | Scaffold batch booths or create single booth | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Booth`, `Ward`, `Campaign` | Verifies parent wardId, enforces booth number uniqueness | 201 Created / 403 Forbidden |
| **PATCH** | `/api/v1/campaigns/[id]/booths/[boothId]` | Update polling station name, area locality, electors | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Booth`, `Ward` | Validates parent wardId and booth number conflict | 200 OK / 403 Forbidden |
| **DELETE** | `/api/v1/campaigns/[id]/booths/[boothId]` | Delete empty polling booth | `SUPER_ADMIN`, `CAMPAIGN_ADMIN` | `Booth`, `Voter`, `Household` | Cascading integrity: blocks deletion if voters or households exist | 200 OK / 409 Conflict |
