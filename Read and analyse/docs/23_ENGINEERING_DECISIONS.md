# Engineering Decisions (Initial ADR Summary)

## ADR-001 — PostgreSQL as SSoT
Decision: PostgreSQL/PostGIS is authoritative.

Why:
- relational integrity
- transactional consistency
- geography
- reporting
- auditability
- mature backup/recovery

## ADR-002 — Modular Monolith First
Decision: NestJS modular monolith.

Why:
- simpler transactions
- faster delivery
- clear module extraction later

## ADR-003 — PWA Before Native App
Decision: responsive Next.js PWA for first production release.

Why:
- one codebase
- faster field iteration
- installable
- offline support possible

Native app can follow if device APIs/offline scale require it.

## ADR-004 — AI is Suggestion Layer
Decision: AI does not directly own authoritative state.

Why:
- hallucination/OCR risk
- auditability
- human correction
- provider flexibility

## ADR-005 — Transactional Outbox
Decision: domain change + outbox event in same transaction.

Why:
- avoids realtime inconsistency

## ADR-006 — Optimistic Locking
Decision: version field on critical mutable records.

Why:
- field sync
- concurrent corrections
- prevents silent overwrite

## ADR-007 — Political Preference Inference Excluded
Decision: no individual political preference or vote probability model.

Why:
- privacy/security risk
- secret ballot principles
- keeps product focused on operations and verified data

## ADR-008 — Private Object Storage
Decision: no uploaded roll file is public.

## ADR-009 — Server-Side Authorization
Decision: UI permissions are convenience only; API/service is authoritative.
