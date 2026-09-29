# RECOVERY STEP 9 — MAP DATA MODEL SPECIFICATION
# CAMPAIGNOPS AI

Date: 2026-09-29
Status: VERIFIED & PERSISTED

## 1. PostgreSQL Schema Reality & Geography Types

PostgreSQL 16 serves as the Single Source of Truth (SSoT).
Inspection confirmed that the standard PostGIS extension is not installed in the local environment. Coordinates are modeled directly in the `Booth` table using 64-bit IEEE 754 floating-point coordinates under WGS84:

```prisma
model Booth {
  id              String      @id @default(uuid())
  campaignId      String
  wardId          String
  boothNumber     Int
  name            String
  areaLocality    String
  pollingStation  String
  totalElectors   Int         @default(0)
  status          String      @default("Active") // Active, Slow, Issue
  coverageStatus  String      @default("Partial") // Not Visited, Partial, Good, Completed
  assignedAgentId String?
  boundaryVersion Int         @default(1)
  latitude        Float?      // WGS84 Latitude (-90 to +90)
  longitude       Float?      // WGS84 Longitude (-180 to +180)
  createdAt       DateTime    @default(now())
  campaign        Campaign    @relation(fields: [campaignId], references: [id])
  ward            Ward        @relation(fields: [wardId], references: [id])
  voters          Voter[]
  households      Household[]
  issues          Issue[]
  visEvents       VisEvent[]
  turnout         TurnoutSnapshot[]
}
```

## 2. GeoJSON Feature Specification

The map endpoint (`GET /api/v1/campaigns/[id]/map`) returns a standard GeoJSON `FeatureCollection`:

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [77.594600, 12.971600] // [Longitude, Latitude]
        },
        "properties": {
          "id": "07338d39-ab94-40e6-84ed-c3dafff45a71",
          "campaignId": "aba451f6-94bc-4bc6-9e4e-23cadf384a0c",
          "wardId": "e0b9687e-c800-4b2e-a5ce-b1187900b3e5",
          "wardNumber": 1,
          "wardName": "Ward 1",
          "boothNumber": 1,
          "name": "Booth 1 - Ward 1",
          "areaLocality": "Sector 1 Locality",
          "pollingStation": "Govt Primary School Hall",
          "totalElectors": 1200,
          "votersCount": 1200,
          "householdsCount": 240,
          "verifiedHouseholdsCount": 5,
          "coveragePct": 2,
          "coverageStatus": "Partial",
          "issuesCount": 0,
          "assignedAgents": [
            {
              "id": "user-agent-uuid",
              "name": "Political Agent",
              "email": "agent@campaignops.ai"
            }
          ],
          "hasLocation": true
        }
      }
    ],
    "summary": {
      "totalBooths": 10,
      "mappedBoothsCount": 2,
      "unmappedBoothsCount": 8,
      "totalHouseholds": 2400,
      "verifiedHouseholds": 48,
      "coveragePct": 2,
      "totalIssues": 3
    },
    "unmappedBooths": [
      {
        "id": "booth-uuid",
        "boothNumber": 3,
        "name": "Booth 3 - Ward 2",
        "hasLocation": false,
        "statusNote": "LOCATION_NOT_SET"
      }
    ]
  }
}
```

## 3. Strict Data Minimization Policy

To comply with electoral privacy guidelines and prevent client memory bloat:
- **No Voter PII**: Individual voter names, father/husband names, house addresses, or EPIC numbers are NEVER returned in the map response payload.
- **Aggregated Metrics Only**: Booth objects convey strictly count aggregations (`votersCount`, `householdsCount`, `verifiedHouseholdsCount`, `issuesCount`).
- **Operational Scope**: Field agents only receive GeoJSON records for booths explicitly assigned to them.
