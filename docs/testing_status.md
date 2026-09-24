# Testing Status — CampaignOps AI

## 1. Test Strategy Matrix
- **Unit & Validation Tests**: Test Zod schemas, domain calculations, permission matrices.
- **Tenant Scoping Tests**: Verify that users in Campaign A cannot read or write records in Campaign B.
- **API Tests**: Validate REST API endpoints against contracts defined in `docs/10_API_CONTRACTS.md`.
- **E2E & Browser UI Tests**: Verify desktop and mobile user flows, form submissions, filter changes, and responsive layout behavior.

## 2. Test Execution Log

| Test Suite | Coverage | Status | Last Run |
|---|---|---|---|
| Domain Models & Prisma Schema | Integrity, foreign keys, unique indexes | 🟡 Pending setup | - |
| Auth & Role Guards | `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT` | ⚪ Planned | - |
| Voter Import Pipeline | Schema validation, duplicate rejection | ⚪ Planned | - |
| Household AI Suggestions | Confidence calculation, member consistency | ⚪ Planned | - |
| Offline Mutation Queue | Idempotency tokens, conflict handling | ⚪ Planned | - |
| VIS Issuance Flow | Turnout aggregation, non-inference guardrails | ⚪ Planned | - |
