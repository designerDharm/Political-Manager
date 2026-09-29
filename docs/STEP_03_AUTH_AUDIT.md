# STEP 3 — AUTHENTICATION, SESSION SECURITY & RBAC AUDIT
**Project:** CampaignOps AI  
**Audit Date:** 2026-09-28  
**Scope:** Authentication flows, session mechanisms, role resolution, API guards, and database schema.

---

## 1. Current Login Flow & Session Mechanism
- **Login UI (`src/app/login/page.tsx`)**:
  - The login form previously was client-side only: on submit, it ran a `setTimeout` of 400ms and routed based on substring matching of the email (`email.includes('admin') => /super-admin`, `email.includes('agent') => /agent`, etc.).
  - No network request was made to any server authentication endpoint.
- **Session Mechanism (`src/lib/auth.ts`)**:
  - Used an insecure cookie named `campaignops_session_user` storing the raw email address.
  - In `getCurrentUser()`, if no cookie was present, it contained an insecure hardcoded fallback:
    ```typescript
    const emailToLookup = sessionEmail || 'admin@campaignops.ai';
    ```
    This meant any unauthenticated visitor was automatically treated as Super Administrator (`admin@campaignops.ai`).

---

## 2. Fallback Identities & Gaps Identified
- **Super Admin Impersonation**: Defaulting to `admin@campaignops.ai` bypassed all authorization checks on server components and API routes.
- **No Password Verification**: No password hashing existed on the `User` model (`passwordHash` column was absent).
- **No Server Session Store**: No `Session` model existed in Prisma schema. Sessions were neither database-backed nor revocable.
- **API Authorization Gaps**:
  - Endpoints under `/api/v1/*` (e.g. `/api/v1/campaigns`, `/api/v1/voters`, `/api/v1/households`, `/api/v1/issues`, `/api/v1/tasks`, `/api/v1/admin/*`, `/api/v1/users`) did not verify authentication tokens or user principals.
  - Endpoints were vulnerable to direct unauthenticated invocation.
  - No campaign isolation or agent scope isolation existed at the database query level.

---

## 3. Remediation Architecture Plan
1. **Schema Enhancements**:
   - Add `passwordHash`, `failedLoginCount`, `lockedUntil` to `User` model.
   - Add `Session` model (`id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `ipAddress`, `userAgent`, `createdAt`, `lastSeenAt`).
   - Run clean Prisma migration to apply to PostgreSQL.
2. **Password & Session Security**:
   - Secure password hashing using Node.js standard `scrypt` (or argon2/pbkdf2) with cryptographic salts.
   - Session tokens generated with `crypto.randomBytes(32)` (256-bit entropy) and hashed with SHA-256 for database storage (`tokenHash`). Raw tokens stored only in HTTP-only, SameSite=Lax, Secure cookies.
3. **Server-Side Authorization Guards (`src/lib/auth.ts`)**:
   - `authenticateRequest(req)`: Resolves principal, checks session validity, expiry, revocation, and active user status.
   - `requireAuthenticatedUser()`
   - `requirePlatformRole('SUPER_ADMIN')`
   - `requireCampaignAccess(campaignId, requiredRole?)`
   - `getAgentScope(userId, campaignId)`
4. **API Route Protection**:
   - Implement `POST /api/v1/auth/login` (rate limited, failed count tracking, generic error message).
   - Implement `POST /api/v1/auth/logout` (revokes session, clears cookie).
   - Implement `GET /api/v1/auth/me` (returns current authenticated principal).
   - Protect all administrative, campaign, and voter APIs with strict role and campaign/scope guards.
5. **UI Integration**:
   - Connect `src/app/login/page.tsx` to `/api/v1/auth/login` with error handling (Idle, Submitting, Invalid Credentials, Account Locked, Server Error).
   - Add `/unauthorized` (403 Forbidden) and redirect unauthenticated requests to `/login`.
