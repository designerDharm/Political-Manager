# Testing & QA Strategy

## 1. Test Pyramid

### Unit
- normalization
- validation
- RBAC policies
- household score rules
- conflict resolution
- campaign lifecycle

### Integration
- PostgreSQL repositories
- tenant isolation
- queues
- object storage
- AI adapter mock
- outbox
- websocket publish

### E2E
- campaign setup
- import
- household review
- agent assignment
- field visit
- offline sync
- election-day VIS
- backup flow

## 2. Critical Security Tests

Test that:
- Agent A cannot view Agent B's non-assigned booth when not authorized
- Campaign A cannot access Campaign B IDs
- Campaign Admin cannot access platform backup
- Super Admin routine view does not expose voter data by default
- revoked user cannot sync queued mutation
- export permission is enforced server-side

## 3. Import QA

Fixtures:
- clean text PDF
- scanned PDF
- rotated pages
- missing fonts
- mixed Hindi/English
- duplicate pages
- corrupted file
- wrong booth mapping

Assertions:
- count reconciliation
- no silent drop
- confidence queue
- original source preserved

## 4. Responsive QA

Devices:
- 360px mobile
- 390/430px mobile
- tablet
- 1366 desktop
- 1440 desktop
- 1920 desktop

## 5. Accessibility QA

- axe
- keyboard-only
- screen reader smoke test
- contrast
- focus order
- error messaging

## 6. Performance Targets

Initial targets:
- p95 normal API < 500ms excluding heavy jobs
- search p95 < 800ms for expected dataset
- dashboard p95 < 2s
- realtime propagation typical < 2s
- mobile interaction response < 100ms for local UI
- import processed asynchronously

## 7. Load Test

Scenarios:
- 1,000 concurrent agents
- burst update at shift start
- election-day x2 expected traffic
- dashboard fanout
- voter search surge

## 8. Definition of Done

Feature requires:
- happy path
- error states
- permission test
- audit event where applicable
- responsive
- accessible
- telemetry
- test coverage
- docs update
