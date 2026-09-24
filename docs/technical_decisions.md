# Technical Decisions & ADR Summary — CampaignOps AI

## ADR-001: Next.js Full-Stack Architecture
- **Decision**: Implement the system using Next.js 14+ (App Router) with server actions and API route handlers alongside a clean domain service layer.
- **Rationale**:
  - Unifies Desktop Super Admin, Campaign Admin, and Mobile Political Agent PWA in a single highly performant, type-safe monorepo.
  - Minimizes inter-service latency and eliminates CORS/cross-port communication complexity during local execution and cloud deployment.
  - Next.js Server Components and Server Actions provide secure server-side authorization directly at the boundary.

## ADR-002: Authoritative Database & Local Port Isolation Fallback
- **Decision**: Use Prisma ORM with PostgreSQL as the production database, and SQLite as the zero-dependency local verification fallback.
- **Rationale**:
  - In restricted sandboxed environments where external port binding or Docker daemon may not be active, SQLite allows 100% full-fidelity local execution, seed data verification, and UI browsing without any external blockers.
  - The schema uses UUID strings and portable relational definitions so switching between PostgreSQL/PostGIS and SQLite requires zero application code changes.

## ADR-003: Strictly Governed Operational Signals (Zero Inference)
- **Decision**: In compliance with the non-negotiable workspace rules, database columns and API DTOs strictly track operational metrics:
  - Visit status: `NOT_VISITED`, `VISITED`, `NO_ONE_AVAILABLE`, `FOLLOW_UP_REQUIRED`, `DECLINED_CONTACT`, `VERIFIED`.
  - Issue statuses: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `ESCALATED`.
  - VIS events: `REQUESTED`, `ISSUED`, `REPRINTED`.
  - No probability scores, political leaning, or persuadability rankings exist anywhere in the code.
