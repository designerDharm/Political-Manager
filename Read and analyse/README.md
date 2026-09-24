# Political Campaign Operations Platform — Antigravity Development Pack

## Purpose

This repository-ready documentation pack defines a web-based, responsive political campaign operations platform with three roles:

1. **Super Admin** — system owner / SaaS operator
2. **Campaign Admin** — candidate, client, campaign manager, or authorized party administrator
3. **Political Agent** — field / ground worker

The product is designed as a **Single Source of Truth (SSoT)** system with real-time updates, auditable data processing, role-based access control, voter-roll ingestion, household suggestions, task assignment, field verification, election-day operations, backups, and AI-assisted data processing.

## Important Product Boundary

The system must **not** infer, score, predict, or rank an individual voter's political preference, likelihood to vote for a candidate, persuadability, ideology, or electoral choice.

Allowed operational signals include:

- visited / not visited
- contact attempted / successful
- data verified / correction required
- follow-up requested
- issue reported / resolved
- household verified
- VIS requested / issued
- worker task completion
- aggregate campaign coverage and turnout inputs

Any self-declared information, where lawfully collected, must be handled under explicit purpose, access, retention, and audit rules. Never infer political preference from demographics, family relations, religion, caste, address, age, or behavioral data.

## Recommended Technology Baseline

- **Frontend:** Next.js + React + TypeScript
- **Styling:** Tailwind CSS + component design system
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL
- **Geo:** PostGIS
- **ORM:** Prisma
- **Cache / Sessions / Locks:** Redis
- **Realtime:** WebSockets / Socket.IO
- **Async Jobs:** BullMQ or managed queue
- **Object Storage:** S3-compatible or Google Cloud Storage
- **Search:** PostgreSQL FTS initially; OpenSearch later if required
- **AI / OCR:** pluggable provider interface, structured outputs only
- **Authentication:** OIDC/OAuth2 compatible provider + MFA
- **Observability:** OpenTelemetry + Sentry-compatible error reporting
- **Deployment:** containerized, Cloud Run/Kubernetes compatible
- **CI/CD:** GitHub Actions or equivalent

## Antigravity Usage Order

1. Place `.agents/rules/workspace.md` in the repository.
2. Add all files in `/docs`.
3. Start Antigravity in repository root.
4. Run the master planning prompt from `18_ANTIGRAVITY_MASTER_PROMPT.md`.
5. Review Antigravity's `implementation_plan.md` before allowing code generation.
6. Execute phase prompts from `19_ANTIGRAVITY_EXECUTION_PROMPTS.md`.
7. Require tests and walkthrough artifacts after every major phase.

## Suggested Repository Layout

```text
/
├─ .agents/
│  └─ rules/
│     └─ workspace.md
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ ui/
│  ├─ config/
│  ├─ types/
│  └─ validation/
├─ prisma/
├─ docs/
├─ infra/
├─ scripts/
├─ tests/
└─ README.md
```

## Documents in This Pack

- Product & requirements
- RBAC
- Domain model
- Architecture
- Database schema
- AI voter-roll processing
- Realtime/offline sync
- UI/UX
- User flows
- APIs
- Security/privacy
- Election-day mode
- AI guardrails
- Testing
- DevOps/backups
- Observability/audit
- Development roadmap
- Antigravity prompts
- Acceptance criteria
- Risk register
- Glossary

## Delivery Principle

**No feature is complete unless it has:**

- permission checks
- validation
- audit logging
- loading/empty/error states
- responsive behavior
- tests
- observability
- rollback or recovery path
