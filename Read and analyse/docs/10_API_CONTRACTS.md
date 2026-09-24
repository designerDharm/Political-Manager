# API Contracts

## 1. Style

REST for primary application API.
WebSocket for realtime notifications.
Async job API for imports/reports.

Base:
```text
/api/v1
```

## 2. Common Response

```json
{
  "data": {},
  "meta": {},
  "requestId": "uuid"
}
```

Errors:
```json
{
  "error": {
    "code": "FORBIDDEN_SCOPE",
    "message": "You do not have access to this resource.",
    "details": {}
  },
  "requestId": "uuid"
}
```

## 3. Campaign

```text
POST   /campaigns
GET    /campaigns/:id
PATCH  /campaigns/:id
POST   /campaigns/:id/activate
GET    /campaigns/:id/dashboard
```

## 4. Geography

```text
GET/POST /campaigns/:id/wards
GET/POST /campaigns/:id/booths
GET      /booths/:id/summary
```

## 5. Imports

```text
POST /campaigns/:id/imports/presign
POST /campaigns/:id/imports
GET  /imports/:id
GET  /imports/:id/anomalies
POST /imports/:id/review
POST /imports/:id/publish
```

## 6. Voters

```text
GET   /campaigns/:id/voters
GET   /voters/:id
PATCH /voters/:id/correction
GET   /voters/:id/history
```

Search must be server-side and permission-scoped.

## 7. Households

```text
GET   /campaigns/:id/households
GET   /households/:id
PATCH /households/:id
POST  /households/:id/verify
POST  /households/:id/members/move
```

Use optimistic version:
```json
{
  "baseVersion": 17,
  "changes": {}
}
```

## 8. Tasks

```text
POST /campaigns/:id/assignments
GET  /me/tasks
POST /tasks/:id/start
POST /tasks/:id/complete
```

## 9. Interactions

```text
POST /households/:id/interactions
POST /voters/:id/interactions
```

Only operational outcomes.

## 10. Issues

```text
POST /issues
GET  /issues
PATCH /issues/:id
POST /issues/:id/events
```

## 11. Election Day

```text
GET  /election-day/dashboard
GET  /election-day/voter-search
POST /election-day/vis
POST /election-day/checkins
POST /election-day/incidents
POST /election-day/turnout-snapshots
```

## 12. Admin

```text
GET  /admin/system-health
GET  /admin/security-events
POST /admin/backups
POST /admin/restores
POST /admin/break-glass
```

## 13. Idempotency

Required for:
- offline mutations
- VIS issuance
- imports
- report creation
- backup creation

Use `Idempotency-Key`.

## 14. Pagination

Cursor-based for large tables:
```text
?limit=50&cursor=...
```

## 15. Security Headers

API should require:
- bearer/session auth
- CSRF protection where cookie auth applies
- request ID
- strict CORS
- rate limiting
