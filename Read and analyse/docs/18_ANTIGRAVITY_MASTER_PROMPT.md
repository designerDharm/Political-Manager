# Google Antigravity — Master Build Prompt

Paste this prompt in Antigravity from repository root.

---

/plan

You are the principal software architect and senior full-stack engineer for a production-grade multi-tenant Political Campaign Operations Platform.

Before changing code, read and obey:

- `.agents/rules/workspace.md`
- every Markdown specification in `/docs`
- existing repository code and configuration

Create a comprehensive `implementation_plan.md` before implementation.

## Product

Build a responsive web application that works smoothly on desktop and mobile/PWA.

Roles:

1. Super Admin — platform owner
2. Campaign Admin — authorized candidate/client/campaign manager
3. Political Agent — field worker

## Core Capabilities

- multi-tenant organization/campaign management
- campaign setup wizard
- election geography hierarchy
- electoral-roll PDF/CSV/XLSX upload
- OCR/AI structured extraction
- immutable source snapshots
- normalized voter database
- AI-suggested household grouping with confidence and human review
- household correction by authorized users
- role/scope-based assignments
- door-to-door operational status
- issue/follow-up management
- real-time dashboards
- responsive maps
- PWA offline mutation queue with conflict resolution
- election-day VIS operations
- aggregate turnout input
- audit logs
- exports
- backups
- security operations

## Critical Political & Privacy Guardrail

DO NOT implement:
- individual vote probability
- political-preference inference
- persuadability score
- ideology inference
- sensitive-trait targeting
- "voted for us" field
- ballot-choice inference

Operational statuses are allowed: visited, contacted, no-one-available, follow-up, verified, correction-needed, VIS requested/issued.

## Architecture

Use:
- TypeScript end-to-end
- Next.js React frontend
- NestJS backend
- PostgreSQL + PostGIS as Single Source of Truth
- Prisma ORM
- Redis
- WebSockets
- async job queue
- private object storage
- provider abstraction for OCR/AI
- OpenTelemetry-compatible observability
- containerized deployment

Start as modular monolith.

## Required Engineering Rules

- strict TypeScript
- Zod/class-validator or equivalent runtime validation
- no `any` unless justified
- tenant scope on every data query
- authorization on server
- optimistic versions on critical mutable records
- transactional outbox for realtime
- idempotency for offline/import/election-day mutations
- no secrets in code
- no sensitive payloads in logs
- immutable audit events
- tests for authorization and tenant isolation
- loading/empty/error UI states
- WCAG 2.2 AA target
- responsive design
- migrations tracked in git

## Implementation Plan Must Include

1. repository/monorepo structure
2. exact packages and dependencies
3. database schema and migrations
4. authentication and RBAC
5. tenant isolation
6. API modules and endpoint plan
7. frontend route map
8. design system
9. import/OCR/AI job pipeline
10. household grouping service
11. realtime architecture
12. offline sync architecture
13. election-day architecture
14. audit/security architecture
15. backup/recovery integration points
16. test strategy
17. observability
18. deployment
19. environment variables
20. seed/demo data
21. verification commands for each phase
22. security/privacy review checklist
23. risks and rollback strategy

Do not implement the entire system in one uncontrolled change.

Break work into the phases defined in `17_DEVELOPMENT_ROADMAP.md`.

After generating the plan, stop and wait for plan review before implementation.
