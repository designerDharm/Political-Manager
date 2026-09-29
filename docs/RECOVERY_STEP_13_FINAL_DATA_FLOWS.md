# RECOVERY STEP 13 — FINAL DATA FLOWS & TRANSACTION SPECIFICATION
# CAMPAIGNOPS AI END-TO-END DATA TRACEABILITY

## 1. Flow A: Voter Roll PDF Import to Published Voter Registry
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Campaign Admin
    participant Server as Next.js API (/api/v1/imports)
    participant Disk as Staging Storage
    participant Extractor as Poppler (pdftotext)
    participant DB as PostgreSQL

    Admin->>Server: POST /api/v1/imports (Multipart PDF)
    Server->>Disk: Persist raw PDF file
    Server->>DB: INSERT into import_batches (status: 'PROCESSING')
    Server->>Extractor: Spawn pdftotext -layout <file>
    alt Digital PDF with text stream
        Extractor-->>Server: Raw text buffer
        Server->>Server: Parse sections, EPIC, names, house numbers, age, gender
        Server->>DB: INSERT into staging_voters (batchId, raw records)
        Server->>DB: UPDATE import_batches (status: 'ReadyToPublish', parsedCount)
        Server-->>Admin: 200 OK (Staging summary for review)
        Admin->>Server: POST /api/v1/imports/[id]/publish
        Server->>DB: BEGIN TRANSACTION
        Server->>DB: INSERT INTO voters SELECT * FROM staging_voters WHERE batchId = id
        Server->>DB: UPDATE import_batches SET status = 'PUBLISHED'
        Server->>DB: COMMIT TRANSACTION
        Server-->>Admin: 200 OK (Published to Authoritative Registry)
    else Scanned Image PDF (0 chars)
        Extractor-->>Server: Empty text buffer
        Server->>DB: UPDATE import_batches (status: 'ScannedPdfOcrRequired')
        Server-->>Admin: 200 OK (Truthful notification: OCR required)
    end
```

---

## 2. Flow B: Household Grouping & Manual Correction
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Campaign Admin
    participant Engine as Grouping Engine (/api/v1/households/groups)
    participant DB as PostgreSQL

    Admin->>Engine: POST /api/v1/households/groups (campaignId, boothId)
    Engine->>DB: SELECT * FROM voters WHERE campaignId = id AND boothId = b
    Engine->>Engine: Cluster by (houseNumber, address, guardian/spouse name, age gap)
    Engine->>DB: BEGIN TRANSACTION
    Engine->>DB: INSERT/UPDATE households
    Engine->>DB: UPDATE voters SET householdId = h.id
    Engine->>DB: COMMIT TRANSACTION
    Engine-->>Admin: 200 OK (Suggested Groups)
    Admin->>Engine: PATCH /api/v1/households/groups (reassign voter X to household Y)
    Engine->>DB: UPDATE voters SET householdId = Y WHERE id = X
    Engine-->>Admin: 200 OK (Persisted Manual Correction)
```

---

## 3. Flow C: Agent Assignment & Field Visit Recording (Online)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Campaign Admin
    actor Agent as Political Agent
    participant API as Server API
    participant SSE as Realtime Hub
    participant DB as PostgreSQL

    Admin->>API: POST /api/v1/assignments (agentId, boothId)
    API->>DB: INSERT INTO campaign_assignments
    Agent->>API: GET /api/v1/voters (Token: Agent)
    API->>DB: SELECT * FROM voters WHERE boothId IN (assignedBooths)
    API-->>Agent: 200 OK (Scoped voters list)
    Agent->>API: POST /api/v1/agent/visits (voterId, status: CONTACTED, note, issue)
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT INTO voter_interactions
    API->>DB: INSERT INTO issues (if reported)
    API->>DB: COMMIT TRANSACTION
    API->>SSE: broadcastEvent('FIELD_VISIT_RECORDED', {boothId, voterId})
    SSE-->>Admin: Event stream message received
    Admin->>API: Background refetch /api/v1/analytics
    API-->>Admin: Updated Dashboard KPIs
```

---

## 4. Flow D: Offline Mutation Queue & Safe Synchronization
```mermaid
sequenceDiagram
    autonumber
    actor Agent as Political Agent
    participant IDB as Client IndexedDB
    participant SW as Sync Worker
    participant API as /api/v1/sync
    participant DB as PostgreSQL

    Note over Agent,IDB: Device Disconnected (Offline)
    Agent->>IDB: Record Visit (uuid: 'mut-123', voterId: 'v-1', status: 'CONTACTED')
    IDB-->>Agent: UI updates optimistically (Pending Sync badge)
    Note over Agent,IDB: Device Reconnects (Online)
    SW->>IDB: Read all pending mutations where synced = false
    SW->>API: POST /api/v1/sync { mutations: [mut-123] }
    API->>DB: BEGIN TRANSACTION
    API->>DB: Check idempotency key ('mut-123')
    API->>DB: INSERT INTO voter_interactions (source: 'OFFLINE_SYNC')
    API->>DB: INSERT INTO sync_audit_records
    API->>DB: COMMIT TRANSACTION
    API-->>SW: 200 OK { processed: ['mut-123'], failed: [] }
    SW->>IDB: Mark mut-123 as synced = true
    SW-->>Agent: UI badge changes to "Synced with Server"
```

---

## 5. Flow E: Election Day VIS & Turnout Invariant Enforcement
```mermaid
sequenceDiagram
    autonumber
    actor Agent as Booth Agent
    participant API as Server API (/api/v1/turnout)
    participant DB as PostgreSQL

    Agent->>API: POST /api/v1/turnout { boothId: 'b-1', turnoutCount: 1500 }
    API->>DB: SELECT totalElectors FROM booths WHERE id = 'b-1'
    DB-->>API: totalElectors = 1000
    alt turnoutCount > totalElectors (1500 > 1000)
        API-->>Agent: 400 Bad Request ("Turnout cannot exceed total electors (1000)")
    else 0 <= turnoutCount <= totalElectors (850 <= 1000)
        API->>DB: INSERT INTO booth_turnout_snapshots (boothId, count: 850, pct: 85.0)
        API-->>Agent: 201 Created (Snapshot persisted)
    end
```

---

## 6. Flow F: Production Backup and Disaster Recovery
```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as Super Admin
    participant API as /api/v1/backups
    participant Tool as pg_dump / pg_restore
    participant DB as PostgreSQL

    SuperAdmin->>API: POST /api/v1/backups (Trigger Manual Snapshot)
    API->>Tool: Execute pg_dump -Fc --clean -f backup_<timestamp>.dump
    Tool->>DB: Stream all schemas, tables, sequences, constraints
    Tool-->>API: Exit code 0 (Dump completed)
    API->>DB: INSERT INTO backup_records (filename, size, checksum, status: 'COMPLETED')
    API-->>SuperAdmin: 201 Created (Backup artifact verified)
```
