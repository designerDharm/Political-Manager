# Workspace Rules — CampaignOps AI

These rules are authoritative for all Antigravity agents working in this repository.

## 1. Read Before Acting

Before implementation:
1. read `/docs` specifications
2. inspect existing code
3. generate/review implementation plan for non-trivial changes

Never silently change architecture.

## 2. Product Boundary

This is a political campaign operations platform, not an individual political persuasion engine.

Never create:
- voter political-preference prediction
- vote probability score
- persuadability score
- ideology inference
- sensitive-trait targeting
- "voted for us" field
- inferred ballot choice

Do not infer sensitive traits from name, household, address, age, language, or geography.

## 3. SSoT

PostgreSQL is the authoritative source of domain state.

Redis, browser cache, IndexedDB, websocket payloads, and AI responses are non-authoritative.

## 4. Security

- server-side authorization on every protected operation
- tenant scope every query
- assignment scope agents
- MFA for privileged actions
- no secrets in source
- no sensitive payloads in logs
- private file storage
- signed short-lived downloads
- immutable audit events
- exports audited

## 5. AI

- structured output schemas
- minimum necessary data
- no direct authoritative DB writes
- human review for low confidence
- prompt injection defense
- provider abstraction
- AI job metadata for audit

## 6. Data Integrity

- preserve source snapshots
- use corrections/version history
- optimistic locking for critical mutable records
- idempotency for retryable operations
- transactional outbox for realtime
- never blind last-write-wins voter/household corrections

## 7. Code Quality

- strict TypeScript
- avoid `any`
- clear module boundaries
- runtime validation
- predictable error types
- small testable services
- reusable UI components
- no duplicated domain constants

## 8. UI

- responsive
- mobile-first for agents
- desktop data density for admins
- WCAG 2.2 AA target
- all async states visible
- offline/sync state explicit
- no color-only meaning

## 9. Testing

Every protected feature needs:
- permission test
- tenant isolation test where relevant
- happy path
- failure path
- regression test for bug fix

## 10. Workflow

For major work:
1. plan
2. implement approved scope
3. typecheck/lint
4. unit/integration tests
5. E2E/browser verification
6. security review
7. Walkthrough artifact

## 11. Database

- migrations only
- foreign keys
- indexes
- timestamps in UTC
- UUIDs
- tenant IDs
- no destructive schema change without migration/recovery plan

## 12. Observability

- request/trace IDs
- structured logs
- no raw personal data in logs
- key metrics
- meaningful alerts

## 13. Stop Conditions

Stop and surface a blocker if a requested implementation:
- weakens tenant isolation
- exposes voter data publicly
- bypasses authorization
- deletes source history
- introduces political preference prediction
- requires unsafe destructive migration without recovery
