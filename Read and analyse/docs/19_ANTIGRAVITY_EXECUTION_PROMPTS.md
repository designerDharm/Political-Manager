# Antigravity Execution Prompts

Use these after the master plan is approved.

## Prompt 1 — Foundation

```text
Implement Phase 0 from the approved implementation_plan.md only.
Create the monorepo, strict TypeScript configuration, linting, formatting, test harness, environment validation, Docker local dependencies, CI workflow, database connection, Prisma baseline, health endpoints, and observability skeleton.

Do not implement business features yet.

Run all verification commands. Fix failures. Produce a Walkthrough artifact listing files changed, commands run, test results, and remaining risks.
```

## Prompt 2 — Auth, Tenancy, RBAC

```text
Implement Phase 1 only.

Build authentication integration, organization membership, campaign membership, role/permission model, campaign creation wizard, campaign lifecycle, and geography hierarchy.

Add server-side authorization guards and tenant isolation at repository/query level. Create explicit tests proving cross-campaign and cross-tenant access is denied.

Create responsive Super Admin and Campaign Admin shells.

Run tests and create a Walkthrough.
```

## Prompt 3 — Import Pipeline

```text
Implement Phase 2 only.

Build secure file upload, object storage adapter, SHA-256 fingerprinting, import records, async page processing, AI/OCR provider interface, schema-validated structured extraction, confidence scoring, anomaly queue, reconciliation screen, and publish workflow.

Preserve immutable source snapshots.

AI must never directly write authoritative voter records without validation.

Use mocked provider for automated tests and configurable real provider adapter.

Run import fixture tests and create a Walkthrough.
```

## Prompt 4 — Voters & Households

```text
Implement Phase 3 only.

Build voter directory, fuzzy search, voter source-vs-verified detail, household candidate generation, confidence display, household review UI, manual corrections, move-member flow, primary household contact, and immutable correction history.

Do not add political preference, vote probability, persuadability, ideology, or sensitive-trait targeting fields.

Add concurrency/version conflict tests.
```

## Prompt 5 — Field Operations

```text
Implement Phase 4 only.

Build agent management, assignment engine, mobile-first agent PWA screens, household visit workflow, operational contact outcomes, follow-ups, issue reporting, realtime transactional outbox, websocket refresh, and dashboard coverage metrics.

Make agent permissions assignment-scoped.

Run desktop/mobile E2E tests.
```

## Prompt 6 — Offline Sync

```text
Implement Phase 5 only.

Add offline-capable task cache, encrypted/minimal local data strategy, mutation queue, mutation IDs, idempotency, base versions, sync engine, conflict handling, revoked-access rejection, and a clear sync status UI.

Never use blind last-write-wins for household/voter corrections.

Test airplane-mode style flows and create a Walkthrough.
```

## Prompt 7 — Analytics & Map

```text
Implement Phase 6 only.

Add operational coverage dashboards by constituency/ward/booth, issue analytics, map visualization, filter state, permitted exports, and an aggregate natural-language analytics service backed by a governed metric/query layer.

The AI analytics layer must refuse individual political preference, persuadability, or ballot-choice inference.

Add tests for prohibited query intents.
```

## Prompt 8 — Election Day

```text
Implement Phase 7 only.

Build Election Day mode, booth readiness, agent check-in, voter lookup for permitted operational purposes, VIS requested/issued events, incidents, and aggregate turnout snapshots.

Do not implement "voted for us", candidate-specific individual vote tracking, or any inference of secret ballot choice.

Load-test critical endpoints and create a Walkthrough.
```

## Prompt 9 — Security Hardening

```text
Implement Phase 8 hardening.

Perform authorization review, audit coverage review, secure headers, rate limiting, upload security, MFA step-up for privileged operations, export controls, break-glass access, backup/restore safeguards, privacy retention hooks, logging redaction, dependency/secret scanning, accessibility review, and performance fixes.

Create a production-readiness report with any unresolved risks.
```

## Prompt 10 — Bug Fix Mode

```text
Inspect the failing feature and reproduce it first. Do not patch blindly.

1. Identify root cause.
2. Show affected data flow and permission boundaries.
3. Write or update a regression test.
4. Apply the smallest safe fix.
5. Run related unit, integration, and E2E tests.
6. Verify in browser at desktop and mobile sizes.
7. Produce a concise Walkthrough with evidence.
```
