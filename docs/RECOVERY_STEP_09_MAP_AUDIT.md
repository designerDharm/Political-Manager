# RECOVERY STEP 9 — REAL MAP / GEOGRAPHY OPERATIONAL AUDIT
# CAMPAIGNOPS AI

Date: 2026-09-29
Branch: main

## 1. Executive Summary

Prior to Recovery Step 9, the map interface in CampaignOps AI was an entirely static visual mock:
- `src/app/campaigns/[id]/map/page.tsx` rendered hardcoded SVG polygons representing fictitious booths (`101`, `102`, `103`, `104`, `105`, `106`, `110`, `118`) with static colors and mock coordinates.
- `src/app/agent/map/page.tsx` rendered a static SVG with hardcoded Delhi coordinates (`28.6139, 77.2090`).
- Neither map connected to real database models (`Booth`, `Ward`, `Household`, `Issue`, `Assignment`).
- Although the Next.js server rendered the page, it violated the **Single Source of Truth (SSoT)** and **Zero Hardcoding Policy**.

## 2. PostgreSQL Reality & Schema Audit

PostgreSQL 16 is active on `localhost:5432` (`campaignops` database).
Examination of the database schema (`prisma/schema.prisma`) revealed:
1. `Booth` model fields:
   - `id`: String (UUID)
   - `campaignId`: String (FK to Campaign)
   - `wardId`: String (FK to Ward)
   - `boothNumber`: Int
   - `name`: String
   - `areaLocality`: String?
   - `pollingStation`: String?
   - `latitude`: Float? (Present in schema and PostgreSQL table)
   - `longitude`: Float? (Present in schema and PostgreSQL table)
   - `boundaryVersion`: Int (Default 1)
   - `coverageStatus`: String (Default "Not Visited")
2. `Ward` model fields:
   - `id`: String (UUID)
   - `campaignId`: String
   - `wardNumber`: Int
   - `name`: String
   - `localityType`: String
   - `boundaryVersion`: Int
3. PostGIS Extension:
   - `SELECT extname FROM pg_extension;` returns only `plpgsql`.
   - PostGIS is **NOT** installed in the local environment.
   - Float-based WGS84 `latitude` and `longitude` fields are utilized, matching standard GPS coordinates, GeoJSON specifications, and avoiding risky binary dependencies.

## 3. Current State of Campaign Geography Data

For demo campaign `aba451f6-94bc-4bc6-9e4e-23cadf384a0c`:
- 10 Booths exist (Booths 1 to 10 across Wards 1 to 5).
- All 10 Booths currently have `latitude = NULL` and `longitude = NULL`.
- `Household` records have `address` and `houseNumber`, but no GPS lat/long (GPS at household level is not captured on electoral PDF rolls).
- Therefore, the operational geography anchor is the **Booth / Polling Station** coordinates.

## 4. Deficiencies Identified

1. **Static Vector Rendering**: Hardcoded `<polygon>` SVG elements instead of dynamic geographic projection or interactive mapping.
2. **Missing Map API**: No endpoint existed (`GET /api/v1/campaigns/[id]/map`) to stream GeoJSON feature collections and operational aggregates.
3. **No Coordinate Management**: `PATCH /api/v1/campaigns/[id]/booths/[boothId]` did not support editing `latitude` or `longitude`.
4. **Lack of Agent Scoping**: Map did not respect the Political Agent's assigned booth scope.
5. **No Empty State Handling**: When booth coordinates are `NULL`, the app showed fake shapes instead of informing the campaign admin that booth coordinates need to be configured.

## 5. Step 9 Recovery Strategy

1. **Create GeoJSON & Operational Map API**:
   - Implement `GET /api/v1/campaigns/[id]/map`.
   - Return standard GeoJSON FeatureCollection of mapped booths.
   - Include unmapped booth count and list (`LOCATION_NOT_SET`).
   - Include PostgreSQL-aggregated metrics per booth: total households, visited/verified households, coverage percentage, open issues count, assigned field agents.
   - Strict RBAC: Campaign Admin sees all campaign booths; Political Agent sees only their assigned booths.
   - Data minimization: Never leak voter names or voter IDs over the map endpoint.

2. **Add Coordinate Mutation Support**:
   - Update `PATCH /api/v1/campaigns/[id]/booths/[boothId]` to accept `latitude` and `longitude` with validation (`-90 <= lat <= 90`, `-180 <= lng <= 180`).
   - Log `BOOTH_LOCATION_UPDATED` in the audit log.

3. **Build Interactive Database-Backed Map Client**:
   - Create `src/components/map/CampaignMapClient.tsx` featuring Leaflet / OpenStreetMap layer.
   - Dynamic markers with color-coding matching field coverage status:
     - Rose: Not Visited (0% coverage)
     - Amber: Partial (1% - 49% coverage)
     - Blue: Good (50% - 99% coverage)
     - Emerald: Completed (100% coverage)
   - Coordinate setup modal for Campaign Admin to input GPS coordinates for unmapped booths.
   - Live updates via `useCampaignRealtime` (SSE).

4. **Update Agent Map Page**:
   - Wire `src/app/agent/map/page.tsx` to the real scoped API to display their assigned polling stations and field progress.

5. **Automated Verification**:
   - Develop `scripts/test_step9_map.py` to assert API RBAC, coordinate validation, database updates, and metric calculation parity.
