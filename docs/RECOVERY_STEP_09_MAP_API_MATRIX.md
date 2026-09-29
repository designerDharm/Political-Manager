# RECOVERY STEP 9 — MAP API MATRIX
# CAMPAIGNOPS AI

Date: 2026-09-29

| Method | Endpoint | Primary Caller | Auth Guard | Scope Check | Validation / Behavior | Audit Event |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/campaigns/[id]/map` | Admin Map View, Agent Map View | `requireAuth` (401 if missing) | `requireCampaignAccess` (403 if unassigned) | Returns GeoJSON `FeatureCollection` for mapped booths, `summary`, and `unmappedBooths`. Political Agent is restricted to assigned booths via `getAgentBoothScope`. | None (Read) |
| `PATCH` | `/api/v1/campaigns/[id]/booths/[boothId]` | Campaign Admin | `requireAuth` (401 if missing) | Role check: `POLITICAL_AGENT` forbidden (403) | Accepts `{ latitude, longitude, name, areaLocality, totalElectors }`. Validates `-90 <= lat <= 90` and `-180 <= lng <= 180` (400 if invalid). Updates PostgreSQL `Booth`. | `BOOTH_LOCATION_UPDATED` |
| `GET` | `/agent/map` | Political Agent | Session Cookie / Next.js Middleware | Scoped to Agent | Displays assigned booths, GPS coordinates status, coverage progress, and quick link to household search. | None |
| `GET` | `/campaigns/[id]/map` | Campaign Admin | Session Cookie / Next.js Middleware | Scoped to Campaign | Renders `CampaignMapClient` with SVG/coordinate node projections, coverage legend, unmapped booth warnings, and GPS coordinate setup modal. | None |
