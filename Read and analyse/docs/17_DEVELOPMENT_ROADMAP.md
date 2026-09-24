# Development Roadmap

## Strategy

Build vertically. Each phase should end with a usable, testable slice.

## Phase 0 — Foundation & Specs

Deliver:
- monorepo
- environment config
- CI
- database
- auth skeleton
- `.agents/rules/workspace.md`
- architecture decision records
- test harness

Exit:
- app runs locally
- CI green
- staging deploy works

## Phase 1 — Identity, Tenancy & Campaign Setup

Build:
- auth/MFA integration
- organizations
- users
- roles
- campaigns
- setup wizard
- geography hierarchy

Exit:
- Campaign Admin creates a campaign
- Agent cannot access admin screens
- tenant isolation tests pass

## Phase 2 — Electoral Roll Import

Build:
- file upload
- object storage
- async jobs
- OCR/provider adapter
- structured extraction
- review UI
- reconciliation

Exit:
- sample roll imported end-to-end
- original source preserved
- low confidence visible

## Phase 3 — Voters & Households

Build:
- voter directory
- household suggestions
- review
- corrections
- source/verified data separation
- fuzzy search

Exit:
- household mistakes can be corrected with audit trail

## Phase 4 — Team & Field Operations

Build:
- team
- assignments
- mobile PWA
- visits
- follow-ups
- issues
- realtime updates

Exit:
- agent updates a visit and admin sees it in near realtime

## Phase 5 — Offline Sync

Build:
- offline cache
- mutation queue
- idempotency
- conflict resolver
- sync UI

Exit:
- test completes a field task offline and safely syncs

## Phase 6 — Analytics & Maps

Build:
- coverage metrics
- ward/booth dashboards
- issues analytics
- map layers
- export controls
- natural language aggregate analytics

Exit:
- no individual political preference inference exists

## Phase 7 — Election-Day Mode

Build:
- activation
- VIS search
- VIS event
- check-in
- incident
- aggregate turnout
- load hardening

Exit:
- election-day simulation passes

## Phase 8 — Hardening

- penetration test
- disaster recovery
- performance
- accessibility
- privacy review
- legal review
- data retention
- production readiness

## Antigravity Rule Per Phase

For each phase:
1. `/plan`
2. review implementation plan
3. implement only approved scope
4. run tests
5. browser verification
6. create walkthrough
7. commit
8. next phase
