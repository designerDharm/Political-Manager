# System Architecture

## 1. Architectural Style

Use a modular monolith initially, designed for later service extraction.

Reason:
- faster MVP development
- simpler transactional consistency
- easier Antigravity code generation
- lower operational complexity
- clear module boundaries can later become services

## 2. Logical Architecture

```text
[Next.js Web/PWA]
       |
       v
[API Gateway / NestJS]
       |
       +------------------------------+
       | Auth / RBAC                  |
       | Campaign                     |
       | Geography                    |
       | Voter / Household            |
       | Imports / AI Jobs            |
       | Assignments / Tasks          |
       | Interactions                 |
       | Issues                       |
       | Election Day                 |
       | Reporting                    |
       | Audit / Security             |
       +------------------------------+
       |
       +--> PostgreSQL + PostGIS  <-- SSoT
       +--> Redis
       +--> Object Storage
       +--> Job Queue
       +--> Realtime Gateway
       +--> AI/OCR Provider Adapter
       +--> Observability Stack
```

## 3. SSoT Rules

PostgreSQL is authoritative for:
- campaign state
- voter normalized state
- household confirmations
- permissions
- tasks
- interactions
- issue records
- election-day events
- audit references

Object storage is authoritative for:
- original PDFs
- generated exports
- evidence/attachments

Redis is never authoritative.

Client local storage is never authoritative.

## 4. Backend Modules

```text
auth
organizations
users
campaigns
geography
imports
voters
households
assignments
tasks
interactions
issues
maps
notifications
election-day
reports
audit
backups
admin
ai
```

## 5. Multi-Tenancy

Every tenant-owned row contains:
- organization_id
- campaign_id where applicable

Recommended:
- application-enforced tenant filters
- PostgreSQL Row Level Security as defense-in-depth for critical tables
- integration tests for cross-tenant denial

## 6. Realtime

Use outbox pattern:

```text
DB transaction
  ├─ update domain table
  └─ insert outbox_event
           |
           v
     event dispatcher
           |
           +--> websocket
           +--> notification
           +--> analytics refresh
```

Never publish realtime event before transaction commit.

## 7. AI Boundary

AI services:
- receive minimum necessary input
- return structured JSON
- cannot directly write authoritative records
- suggestions pass validation
- review required for low confidence
- full job audit metadata stored

## 8. Cloud Mapping — GCP Example

- Cloud Run: web + API workers
- Cloud SQL PostgreSQL: SSoT
- Memorystore: Redis
- Cloud Storage: files
- Pub/Sub / Cloud Tasks: async jobs
- Secret Manager: secrets
- Cloud Armor: edge protection
- Cloud KMS: encryption keys
- Cloud Logging/Monitoring: telemetry

The architecture should remain portable.
