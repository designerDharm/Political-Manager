# GOLDEN PATH 01 — SPECIFICATION & VERIFICATION PLAN

**Workflow Objective:**  
Zero Mock End-to-End Campaign Field Lifecycle:  
`LOGIN` → `SELECT CAMPAIGN` → `IMPORT VOTER DATA` → `CREATE VOTERS` → `CREATE/SUGGEST HOUSEHOLDS` → `ASSIGN HOUSEHOLDS TO AGENT` → `AGENT OPENS MOBILE TASK` → `AGENT COMPLETES HOUSEHOLD VISIT` → `SERVER SAVES INTERACTION` → `ADMIN DASHBOARD UPDATES` → `REFRESH BROWSER` → `DATA REMAINS PERSISTENT`

---

## Participating APIs & Database Tables

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Campaign Admin
    actor Agent as Political Agent
    participant Web as Web UI (Admin & Agent)
    participant API as Next.js API Routes
    participant DB as SQLite / PostgreSQL (Prisma)

    Admin->>Web: 1. Login & Select Campaign
    Web->>API: GET /api/v1/campaigns
    API->>DB: prisma.campaign.findMany()
    DB-->>Web: Return Active Campaign

    Admin->>Web: 2. Upload Electoral Roll PDF
    Web->>API: POST /api/v1/imports
    API->>DB: prisma.electoralRollImport.create()
    DB-->>Web: Import Job Created

    Admin->>Web: 3. Publish Import & Generate Households
    Web->>API: POST /api/v1/imports/publish
    API->>DB: prisma.$transaction(Ward, Booth, Household, Voter)
    DB-->>Web: 100% Authoritative DB Records Created

    Admin->>Web: 4. Assign Booth/Sector to Field Agent
    Web->>API: POST /api/v1/tasks
    API->>DB: prisma.assignment.create()
    DB-->>Web: Assignment Saved

    Agent->>Web: 5. Open Mobile Tasks
    Web->>API: GET /api/v1/tasks?userId=...
    API->>DB: prisma.assignment.findMany()
    DB-->>Web: Display Assigned Households

    Agent->>Web: 6. Open Household Visit & Complete Check-In
    Web->>API: GET /api/v1/households/:hid
    API->>DB: prisma.household.findUnique(include: members)
    DB-->>Web: Real Members Rendered

    Agent->>Web: 7. Save Visit Interaction
    Web->>API: POST /api/v1/sync
    API->>DB: prisma.household.update(status: Verified), prisma.interaction.create()
    DB-->>Web: Mutation Confirmed (HTTP 200)

    Admin->>Web: 8. Admin Field Dashboard Refreshes
    Web->>API: Server-Side Query
    API->>DB: prisma.household.count(status: Verified)
    DB-->>Web: Coverage Rate Updated (e.g. 100% or 1/1)
```

---

## Action Plan for Golden Path 01:
1. **Fix `src/app/agent/search/page.tsx`**: Replace `mockVoters` with live search query against `GET /api/v1/voters?q=...`.
2. **Implement `src/app/api/v1/households/[hid]/route.ts`**: Return live household with associated members.
3. **Fix `src/app/agent/visit/[hid]/page.tsx`**: Fetch live household details & members dynamically from `/api/v1/households/[hid]`.
4. **Fix `src/app/agent/tasks/page.tsx`**: Ensure task link points to the exact assigned household ID instead of static `H-001`.
5. **Run End-to-End Automated Script**: Execute every step from import to visit completion and verify DB persistence.
