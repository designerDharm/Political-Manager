# CURRENT RECOVERY ORDER
**Audit Date:** 2026-09-28  

### Fix 1: Wire Login UI to `/api/v1/auth/login` & Seed Real Passwords
- **Why it blocks others:** Secure role-based routing and campaign context resolution depend on an authoritative HTTP-only session cookie. Without this, users navigate as unauthenticated guests or rely on client-side route redirects.
- **Affected modules:** `src/app/login/page.tsx`, `src/lib/auth.ts`, `src/app/api/v1/auth/*`.

### Fix 2: Add Route Middleware & API Session Verification
- **Why it blocks others:** Protects endpoints from unauthenticated callers and enforces tenant, campaign, and agent assignment scoping directly at the server level.
- **Affected modules:** `src/middleware.ts`, `src/app/api/v1/*`.

### Fix 3: Connect Agent Search to `/api/v1/voters`
- **Why it blocks others:** Political agents on the ground need to search real voters within their assigned booth rather than viewing static prototype arrays.
- **Affected modules:** `src/app/agent/search/page.tsx`.

### Fix 4: Upgrade Backup Routine from SQLite `dev.db` to PostgreSQL Dump
- **Why it blocks others:** System administrators need actual database backup snapshots rather than copying an inactive SQLite file.
- **Affected modules:** `src/app/api/v1/admin/backups/route.ts`.

### Fix 5: Replace Realtime Polling with Client SSE Subscriptions
- **Why it blocks others:** Real-time visibility between field agents and campaign control rooms requires client hooks listening to the active SSE stream.
- **Affected modules:** `src/components/layout/*`, `src/app/api/v1/realtime/route.ts`.
